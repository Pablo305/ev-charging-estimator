import {
  EstimateInput,
  EstimateLineItem,
  ManualReviewTrigger,
} from './types';
import {
  PRICEBOOK,
  findPricebookItem,
  findSuperchargerPackage,
  resolvePrice,
  KNOWN_OVERRIDES,
  TESLA_SUPERCHARGER_PACKAGES,
  SERVICE_FEES,
  PricebookItem,
} from './catalog';

// ============================================================
// Helpers — Counter factory for request-scoped IDs
// ============================================================

interface IdCounters {
  nextLineId: () => string;
  nextReviewId: () => string;
}

function createCounters(): IdCounters {
  let lineItemCounter = 0;
  let reviewCounter = 0;
  return {
    nextLineId() {
      lineItemCounter += 1;
      return `LI-${String(lineItemCounter).padStart(3, '0')}`;
    },
    nextReviewId() {
      reviewCounter += 1;
      return `MR-${String(reviewCounter).padStart(3, '0')}`;
    },
  };
}

let _counters: IdCounters = createCounters();

function line(
  partial: Omit<EstimateLineItem, 'id' | 'extendedPrice'>,
): EstimateLineItem {
  return {
    ...partial,
    id: _counters.nextLineId(),
    extendedPrice: Math.round(partial.quantity * partial.unitPrice * 100) / 100,
  };
}

function review(
  partial: Omit<ManualReviewTrigger, 'id'>,
): ManualReviewTrigger {
  return { ...partial, id: _counters.nextReviewId() };
}

/** Helper to generate a line from a pricebook item */
function pricebookLine(
  item: PricebookItem,
  quantity: number,
  overrides?: {
    unitPrice?: number;
    pricingSource?: EstimateLineItem['pricingSource'];
    ruleName?: string;
    ruleReason?: string;
    sourceInputs?: string[];
    manualReviewRequired?: boolean;
    manualReviewReason?: string;
    confidence?: 'high' | 'medium' | 'low';
  },
): EstimateLineItem {
  const resolved = resolvePrice(item, true);
  const unitPrice = overrides?.unitPrice ?? resolved.price ?? 0;
  const source =
    overrides?.pricingSource ??
    (resolved.source === 'override'
      ? 'catalog_override'
      : resolved.source === 'catalog'
        ? 'catalog'
        : 'tbd');

  return line({
    category: item.category,
    description: item.description,
    quantity,
    unit: item.unit,
    unitPrice,
    pricingSource: source as EstimateLineItem['pricingSource'],
    ruleName: overrides?.ruleName ?? `${item.category} auto-select`,
    ruleReason: overrides?.ruleReason ?? `Selected from pricebook: ${item.description}`,
    sourceInputs: overrides?.sourceInputs ?? [],
    manualReviewRequired:
      overrides?.manualReviewRequired ?? (resolved.price === null),
    manualReviewReason:
      resolved.price === null
        ? `No catalog price for: ${item.description}`
        : overrides?.manualReviewReason,
    confidence: overrides?.confidence ?? (resolved.price !== null ? 'high' : 'low'),
  });
}

// ============================================================
// Rule Categories
// ============================================================

// ── 1. Charger Hardware Rules ──────────────────────────────────

function chargerHardwareRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { charger, purchasingChargers, estimateControls } = input;

  // Customer supplies chargers — skip hardware
  if (charger.isCustomerSupplied || purchasingChargers.responsibility === 'client') {
    reviews.push(
      review({
        field: 'charger.isCustomerSupplied',
        condition: 'Customer-supplied chargers',
        severity: 'info',
        message: 'Charger hardware excluded — customer is supplying equipment. Install labor still included.',
      }),
    );
    return { items, reviews };
  }

  const brandLower = charger.brand.toLowerCase();
  const modelLower = charger.model.toLowerCase();

  // ── Tesla Supercharger (L3 DCFC) ──
  if (
    brandLower.includes('tesla') &&
    (modelLower.includes('supercharger') || charger.chargingLevel === 'l3_dcfc')
  ) {
    const pkg = findSuperchargerPackage(charger.count);
    if (pkg) {
      const isBulk = estimateControls.pricingTier === 'bulk_discount';
      const price = isBulk ? pkg.bulkPrice : pkg.msrpPrice;
      items.push(
        line({
          category: 'CHARGER',
          description: `${pkg.description} (${isBulk ? 'Bulk' : 'MSRP'})`,
          quantity: 1,
          unit: 'PKG',
          unitPrice: price,
          pricingSource: isBulk ? 'catalog_bulk' : 'catalog_msrp',
          ruleName: 'Supercharger package selection',
          ruleReason: `Selected ${pkg.stallCount}-stall package for ${charger.count} requested stalls. Price tier: ${isBulk ? 'Bulk Discount' : 'MSRP'}.`,
          sourceInputs: ['charger.brand', 'charger.count', 'estimateControls.pricingTier'],
          manualReviewRequired: pkg.stallCount !== charger.count,
          manualReviewReason:
            pkg.stallCount !== charger.count
              ? `No exact ${charger.count}-stall package. Using ${pkg.stallCount}-stall.`
              : undefined,
          confidence: pkg.stallCount === charger.count ? 'high' : 'medium',
        }),
      );
      if (pkg.availability === 'roadmap') {
        reviews.push(
          review({
            field: 'charger.model',
            condition: 'Roadmap product selected',
            severity: 'warning',
            message: `${pkg.description} is not yet available (${pkg.availabilityNote}). Requires approval to quote.`,
          }),
        );
      }
    } else {
      reviews.push(
        review({
          field: 'charger.count',
          condition: 'No matching Supercharger package',
          severity: 'critical',
          message: `No Supercharger package fits ${charger.count} stalls. Custom quote required.`,
        }),
      );
    }
    return { items, reviews };
  }

  // ── Tesla UWC (L2) ──
  if (brandLower.includes('tesla')) {
    const uwcItem = findPricebookItem('charger-tesla-uwc-gen3');
    if (uwcItem) {
      items.push(
        pricebookLine(uwcItem, charger.count, {
          ruleName: 'Tesla UWC hardware',
          ruleReason: `${charger.count}x Tesla Universal Wall Connector at $${uwcItem.catalogPrice}/ea from pricebook`,
          sourceInputs: ['charger.brand', 'charger.model', 'charger.count'],
        }),
      );
    }
    return { items, reviews };
  }

  // ── ChargePoint ──
  if (brandLower.includes('chargepoint')) {
    // Try to match specific model from pricebook
    const cpItems = PRICEBOOK.filter(
      (p) => p.category === 'CHARGER' && p.description.toLowerCase().includes('chargepoint'),
    );
    let matched: PricebookItem | undefined;

    // Match by model number and mount/port type
    const mountKey = charger.mountType === 'wall' ? 'wall' : 'pedestal';
    const portKey = charger.portType === 'dual' ? 'dual' : 'single';

    if (modelLower.includes('cpf50')) {
      if (portKey === 'dual') {
        matched = findPricebookItem('charger-cp-cpf50-dual-cmk');
      } else if (mountKey === 'wall') {
        matched = findPricebookItem('charger-cp-cpf50-wall-single');
      } else {
        matched = findPricebookItem('charger-cp-cpf50-ped-single');
      }
    } else if (modelLower.includes('ct4011')) {
      matched = findPricebookItem('charger-cp-ct4011-wall-single');
    } else if (modelLower.includes('ct4021')) {
      matched = findPricebookItem('charger-cp-ct4021-wall-dual');
    } else if (modelLower.includes('ct4013')) {
      matched = findPricebookItem('charger-cp-ct4013-ped-single');
    } else if (modelLower.includes('ct4023')) {
      matched = findPricebookItem('charger-cp-ct4023-ped-dual');
    } else if (modelLower.includes('ct6013')) {
      matched = findPricebookItem('charger-cp-ct6013-ped-single');
    } else if (modelLower.includes('ct6023')) {
      matched = findPricebookItem('charger-cp-ct6023-ped-dual');
    } else {
      // Generic ChargePoint match by mount+port
      matched = cpItems.find((p) => {
        const d = p.description.toLowerCase();
        return d.includes(mountKey) && d.includes(portKey);
      });
    }

    if (matched) {
      items.push(
        pricebookLine(matched, charger.count, {
          ruleName: 'ChargePoint hardware',
          ruleReason: `${charger.count}x ${matched.description}`,
          sourceInputs: ['charger.brand', 'charger.model', 'charger.count', 'charger.mountType', 'charger.portType'],
        }),
      );
      if (matched.catalogPrice === null) {
        reviews.push(
          review({
            field: 'charger.model',
            condition: 'No catalog price',
            severity: 'critical',
            message: `${matched.description} has no price in the pricebook. Manual pricing required.`,
          }),
        );
      }
    } else {
      reviews.push(
        review({
          field: 'charger.model',
          condition: 'ChargePoint model not found in pricebook',
          severity: 'critical',
          message: `Could not match ChargePoint model "${charger.model}" to pricebook. Manual selection required.`,
        }),
      );
    }
    return { items, reviews };
  }

  // ── Other brands (Blink, SWTCH, EV Connect, Xeal, etc.) ──
  const otherBrandItems = PRICEBOOK.filter(
    (p) => p.category === 'CHARGER' && p.description.toLowerCase().includes(brandLower),
  );
  if (otherBrandItems.length > 0) {
    const matched = otherBrandItems[0];
    items.push(
      pricebookLine(matched, charger.count, {
        ruleName: `${charger.brand} hardware`,
        ruleReason: `${charger.count}x ${matched.description}`,
        sourceInputs: ['charger.brand', 'charger.count'],
      }),
    );
    if (matched.catalogPrice === null) {
      reviews.push(
        review({
          field: 'charger.model',
          condition: 'No catalog price',
          severity: 'critical',
          message: `${matched.description} has no price in the pricebook. Manual pricing required.`,
        }),
      );
    }
  } else {
    reviews.push(
      review({
        field: 'charger.brand',
        condition: 'Brand not in pricebook',
        severity: 'critical',
        message: `Brand "${charger.brand}" not found in pricebook. Manual charger selection required.`,
      }),
    );
  }

  return { items, reviews };
}

// ── 2. Pedestal Rules ──────────────────────────────────────────

function pedestalRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { charger } = input;

  if (charger.mountType !== 'pedestal' && charger.mountType !== 'mix') {
    return { items, reviews };
  }

  const pedCount = charger.pedestalCount > 0 ? charger.pedestalCount : charger.count;
  const pedItem = findPricebookItem('pedestal-tesla-wc');

  if (pedItem && input.charger.brand.toLowerCase().includes('tesla')) {
    items.push(
      pricebookLine(pedItem, pedCount, {
        ruleName: 'Tesla pedestal',
        ruleReason: `${pedCount}x Tesla pedestal at $${pedItem.catalogPrice}/ea. Mount type: ${charger.mountType}.`,
        sourceInputs: ['charger.mountType', 'charger.pedestalCount', 'charger.brand'],
      }),
    );
  } else if (charger.mountType === 'pedestal' || charger.mountType === 'mix') {
    // Non-Tesla pedestal — no pricebook entry, needs manual review
    reviews.push(
      review({
        field: 'charger.mountType',
        condition: 'Non-Tesla pedestal needed',
        severity: 'warning',
        message: `Pedestal mount required for ${charger.brand} but no pedestal item in pricebook. Manual pricing needed.`,
      }),
    );
  }

  return { items, reviews };
}

// ── 3. Install Labor Rules ─────────────────────────────────────

function installLaborRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { charger, chargerInstall } = input;

  // Skip if Supercharger (install handled differently)
  if (
    charger.brand.toLowerCase().includes('tesla') &&
    (charger.model.toLowerCase().includes('supercharger') || charger.chargingLevel === 'l3_dcfc')
  ) {
    return { items, reviews };
  }

  if (chargerInstall.responsibility === 'client') {
    reviews.push(
      review({
        field: 'chargerInstall.responsibility',
        condition: 'Client installs chargers',
        severity: 'info',
        message: 'Charger installation excluded — client responsibility.',
      }),
    );
    return { items, reviews };
  }

  // Determine correct install labor item
  const isWall = charger.mountType === 'wall';
  const isDual = charger.portType === 'dual';
  const isXeal = charger.brand.toLowerCase().includes('xeal');

  let installItemId: string;
  if (isXeal && isDual) {
    installItemId = 'eleclbr-install-xeal-ped-dual';
  } else if (isWall && isDual) {
    installItemId = 'eleclbr-install-wall-dual';
  } else if (isWall) {
    installItemId = 'eleclbr-install-wall-single';
  } else if (isDual) {
    installItemId = 'eleclbr-install-ped-dual';
  } else {
    installItemId = 'eleclbr-install-ped-single';
  }

  // For wall mount, default to wall; for pedestal, default to pedestal
  if (charger.mountType === null || charger.mountType === 'other') {
    installItemId = isDual ? 'eleclbr-install-wall-dual' : 'eleclbr-install-wall-single';
    reviews.push(
      review({
        field: 'charger.mountType',
        condition: 'Mount type unknown',
        severity: 'warning',
        message: 'Mount type not specified — defaulting to wall-mounted install labor. Verify before finalizing.',
      }),
    );
  }

  const installItem = findPricebookItem(installItemId);
  if (installItem) {
    items.push(
      pricebookLine(installItem, charger.count, {
        ruleName: 'Charger install labor',
        ruleReason: `${charger.count}x ${installItem.description} at $${installItem.catalogPrice}/ea`,
        sourceInputs: ['charger.count', 'charger.mountType', 'charger.portType', 'charger.brand'],
      }),
    );
  }

  return { items, reviews };
}

// ── 4. Electrical Material Rules ───────────────────────────────

function electricalRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { electrical, charger, makeReady } = input;

  // Skip electrical if make ready is client responsibility
  if (makeReady.responsibility === 'client') {
    reviews.push(
      review({
        field: 'makeReady.responsibility',
        condition: 'Client handles make-ready',
        severity: 'info',
        message: 'Electrical make-ready work excluded — client responsibility.',
      }),
    );
    return { items, reviews };
  }

  // ── Conduit, Wire, Breakers (ELEC LBR MAT) ──
  const conduitItem = findPricebookItem('eleclbrmat-conduit-wire');
  if (conduitItem) {
    const distance = input.mapWorkspace?.conduitDistance_ft ?? electrical.distanceToPanel_ft ?? 50; // map > form > default
    const distanceKnown = (input.mapWorkspace?.conduitDistance_ft != null) || electrical.distanceToPanel_ft !== null;

    items.push(
      pricebookLine(conduitItem, distance, {
        ruleName: 'Conduit/wire/breakers',
        ruleReason: `${distance} LF of EMT conduit, wire, breakers at $${resolvePrice(conduitItem, true).price}/ft. ${input.mapWorkspace?.conduitDistance_ft != null ? 'Distance from map measurement.' : distanceKnown ? 'Distance from SOW.' : 'Distance estimated at 50ft — verify at site walk.'}`,
        sourceInputs: [input.mapWorkspace?.conduitDistance_ft != null ? 'mapWorkspace.conduitDistance_ft' : 'electrical.distanceToPanel_ft', 'charger.count'],
        manualReviewRequired: !distanceKnown,
        manualReviewReason: !distanceKnown
          ? 'Electrical distance not specified — using 50ft estimate'
          : undefined,
        confidence: distanceKnown ? 'high' : 'medium',
      }),
    );

    if (!distanceKnown) {
      reviews.push(
        review({
          field: 'electrical.distanceToPanel_ft',
          condition: 'Distance unknown',
          severity: 'warning',
          message: 'Electrical distance not specified. Using 50ft default. Verify at site walk.',
        }),
      );
    }
  }

  // ── Sub-panel (if needed) ──
  if (electrical.panelUpgradeRequired === true || charger.count >= 4) {
    const subpanelItem = findPricebookItem('eleclbrmat-subpanel');
    if (subpanelItem) {
      items.push(
        pricebookLine(subpanelItem, 1, {
          ruleName: 'EV sub-panel',
          ruleReason: charger.count >= 4
            ? `Sub-panel recommended for ${charger.count} chargers`
            : 'Panel upgrade flagged in SOW',
          sourceInputs: ['electrical.panelUpgradeRequired', 'charger.count'],
          confidence: electrical.panelUpgradeRequired === true ? 'high' : 'medium',
        }),
      );
    }
  }

  // ── Transformer (ELEC) ──
  if (electrical.transformerRequired === true) {
    const xfrmrItem = findPricebookItem('elec-transformer');
    if (xfrmrItem) {
      items.push(
        pricebookLine(xfrmrItem, 1, {
          ruleName: 'Transformer upgrade',
          ruleReason: 'Transformer required per SOW — TBD pricing, requires manual quote.',
          sourceInputs: ['electrical.transformerRequired'],
          manualReviewRequired: true,
          manualReviewReason: 'Transformer pricing is always TBD — requires site-specific quote',
          confidence: 'low',
        }),
      );
      reviews.push(
        review({
          field: 'electrical.transformerRequired',
          condition: 'Transformer needed',
          severity: 'critical',
          message: 'Transformer upgrade required — pricing TBD. Cannot auto-price.',
        }),
      );
    }
  }

  // ── Capacity unknown ──
  if (!electrical.availableCapacityKnown) {
    reviews.push(
      review({
        field: 'electrical.availableCapacityKnown',
        condition: 'Electrical capacity unknown',
        severity: 'warning',
        message: 'Available electrical capacity not confirmed. May need panel upgrade or transformer after site evaluation.',
      }),
    );
  }

  return { items, reviews };
}

// ── 5. Civil / Parking Environment Rules ───────────────────────

function civilRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { parkingEnvironment, electrical, charger } = input;
  const baseDistance = electrical.distanceToPanel_ft ?? 50;
  const distance = baseDistance; // used for coring qty estimation

  // ── MIXED environment → force manual review ──
  if (parkingEnvironment.type === 'mixed') {
    reviews.push(
      review({
        field: 'parkingEnvironment.type',
        condition: 'Mixed parking environment',
        severity: 'critical',
        message: 'Mixed parking environment (garage + surface lot). All civil line items require manual review — cannot auto-determine scope split.',
      }),
    );
  }

  // ── Parking Garage logic ──
  if (parkingEnvironment.type === 'parking_garage' || parkingEnvironment.type === 'mixed') {
    // Coring & slab scan
    const coringItem = findPricebookItem('civil-coring-slab-scan');
    if (coringItem) {
      const coringQty = Math.max(1, Math.ceil(charger.count / 2));
      items.push(
        pricebookLine(coringItem, coringQty, {
          ruleName: 'Garage coring & slab scan',
          ruleReason: `Parking garage requires coring for conduit routing. ${coringQty} locations estimated. Catalog: $${coringItem.catalogPrice}, typical override: $${KNOWN_OVERRIDES['civil-coring-slab-scan']?.typicalOverride ?? coringItem.catalogPrice}.`,
          sourceInputs: ['parkingEnvironment.type', 'charger.count'],
          manualReviewRequired: parkingEnvironment.type === 'mixed',
          manualReviewReason: parkingEnvironment.type === 'mixed' ? 'Mixed environment — verify garage scope' : undefined,
          confidence: parkingEnvironment.type === 'mixed' ? 'low' : 'medium',
        }),
      );
    }

    // PT slab check
    if (parkingEnvironment.hasPTSlab === true || parkingEnvironment.hasPTSlab === null) {
      reviews.push(
        review({
          field: 'parkingEnvironment.hasPTSlab',
          condition: parkingEnvironment.hasPTSlab === null ? 'PT slab status unknown' : 'PT slab present',
          severity: parkingEnvironment.hasPTSlab === null ? 'critical' : 'warning',
          message: parkingEnvironment.hasPTSlab === null
            ? 'Post-tensioned slab status unknown in garage. MUST determine before estimating — coring into PT cables is catastrophic.'
            : 'Post-tensioned slab confirmed. Slab scan mandatory before any coring.',
        }),
      );
    }

    // Concrete cutting in garage
    const concreteCutItem = findPricebookItem('civil-concrete-cutting');
    if (concreteCutItem && distance > 0) {
      const cutDist = input.mapWorkspace?.concreteCuttingDistance_ft ?? Math.min(distance, 100);
      items.push(
        pricebookLine(concreteCutItem, cutDist, {
          ruleName: 'Garage concrete cutting',
          ruleReason: `${cutDist} LF of concrete cutting & trenching in garage at $${concreteCutItem.catalogPrice}/ft`,
          sourceInputs: ['parkingEnvironment.type', 'electrical.distanceToPanel_ft'],
          manualReviewRequired: parkingEnvironment.type === 'mixed',
          confidence: 'medium',
        }),
      );
    }
  }

  // ── Surface Lot logic ──
  if (parkingEnvironment.type === 'surface_lot' || parkingEnvironment.type === 'mixed') {
    // Trenching
    if (parkingEnvironment.trenchingRequired !== false) {
      const trenchItem = findPricebookItem('civil-trenching');
      const trenchDist = input.mapWorkspace?.trenchingDistance_ft ?? distance;
      if (trenchItem && trenchDist > 0) {
        items.push(
          pricebookLine(trenchItem, trenchDist, {
            ruleName: 'Surface trenching',
            ruleReason: `${trenchDist} LF trenching in soft/normal soil at $${trenchItem.catalogPrice}/ft`,
            sourceInputs: ['parkingEnvironment.type', 'parkingEnvironment.trenchingRequired', 'electrical.distanceToPanel_ft'],
            manualReviewRequired: parkingEnvironment.type === 'mixed',
            confidence: 'medium',
          }),
        );
      }
    }

    // Boring (if flagged or under hard surface)
    if (parkingEnvironment.boringRequired === true) {
      const boreItem = findPricebookItem('civil-boring-hand');
      if (boreItem) {
        const boreDist = input.mapWorkspace?.boringDistance_ft ?? Math.min(distance, 50);
        items.push(
          pricebookLine(boreItem, boreDist, {
            ruleName: 'Surface boring',
            ruleReason: `${boreDist} LF boring by hand at $${boreItem.catalogPrice}/ft`,
            sourceInputs: ['parkingEnvironment.boringRequired', 'electrical.distanceToPanel_ft'],
            confidence: 'medium',
          }),
        );
      }
    }

    // Concrete pads (for pedestal mount on surface)
    if (charger.mountType === 'pedestal' && parkingEnvironment.type === 'surface_lot') {
      const padItem = findPricebookItem('civil-concrete-pad');
      if (padItem) {
        const padCount = charger.pedestalCount > 0 ? charger.pedestalCount : charger.count;
        if (padCount >= 2) {
          items.push(
            pricebookLine(padItem, padCount, {
              ruleName: 'Concrete pads for pedestals',
              ruleReason: `${padCount}x concrete pads at $${padItem.catalogPrice}/ea. Minimum order 2.`,
              sourceInputs: ['charger.mountType', 'charger.pedestalCount', 'parkingEnvironment.type'],
              confidence: 'medium',
            }),
          );
        }
      }
    }
  }

  // ── Concrete Removal & Restoration (when trenching through concrete areas) ──
  if (parkingEnvironment.surfaceType === 'concrete' && parkingEnvironment.trenchingRequired !== false) {
    const trenchDist = input.mapWorkspace?.trenchingDistance_ft ?? distance;
    const removalQty = Math.max(1, Math.ceil(trenchDist / 15)); // ~1 CY per 15 LF
    const concreteRemovalItem = findPricebookItem('civil-concrete-removal');
    if (concreteRemovalItem) {
      items.push(pricebookLine(concreteRemovalItem, removalQty, {
        ruleName: 'Concrete removal',
        ruleReason: `${removalQty} CY concrete removal for conduit trenching at $${concreteRemovalItem.catalogPrice}/CY`,
        sourceInputs: ['parkingEnvironment.surfaceType'],
        confidence: 'medium',
      }));
    }
    const concreteRestoreItem = findPricebookItem('civil-concrete-restore');
    if (concreteRestoreItem) {
      items.push(pricebookLine(concreteRestoreItem, removalQty, {
        ruleName: 'Concrete restoration',
        ruleReason: `${removalQty} CY concrete restoration after trenching at $${concreteRestoreItem.catalogPrice}/CY`,
        sourceInputs: ['parkingEnvironment.surfaceType'],
        confidence: 'medium',
      }));
    }
  }

  // ── Core Drilling (for conduit penetrations in concrete/masonry) ──
  if (parkingEnvironment.coringRequired === true) {
    const coreDrillItem = findPricebookItem('civil-core-small');
    if (coreDrillItem) {
      const coreQty = Math.max(1, Math.ceil(charger.count / 2));
      items.push(pricebookLine(coreDrillItem, coreQty, {
        ruleName: 'Core drilling',
        ruleReason: `${coreQty}x core drilling 1"-6" at $${coreDrillItem.catalogPrice}/ea for conduit penetrations`,
        sourceInputs: ['parkingEnvironment.coringRequired', 'charger.count'],
        confidence: 'medium',
      }));
    }
    const scanItem = findPricebookItem('civil-scan-xray');
    if (scanItem) {
      items.push(pricebookLine(scanItem, 1, {
        ruleName: 'Scan/X-ray',
        ruleReason: `Wall/floor scan at $${scanItem.catalogPrice}/ea — required before any coring`,
        sourceInputs: ['parkingEnvironment.coringRequired'],
        confidence: 'high',
      }));
    }
  }

  // ── Curb & Gutter (for surface lot pedestal installations) ──
  if (parkingEnvironment.type === 'surface_lot' && charger.mountType === 'pedestal' && charger.count > 0) {
    const curbItem = findPricebookItem('civil-curb-gutter');
    if (curbItem) {
      items.push(pricebookLine(curbItem, charger.count, {
        ruleName: 'Concrete curb & gutter',
        ruleReason: `${charger.count}x curb sections at $${curbItem.catalogPrice}/LF for charger pedestals`,
        sourceInputs: ['parkingEnvironment.type', 'charger.mountType', 'charger.count'],
        confidence: 'medium',
      }));
    }
    const headerItem = findPricebookItem('civil-header-curb');
    if (headerItem) {
      items.push(pricebookLine(headerItem, charger.count, {
        ruleName: 'Concrete header curb',
        ruleReason: `${charger.count}x header curb sections at $${headerItem.catalogPrice}/LF`,
        sourceInputs: ['parkingEnvironment.type', 'charger.count'],
        confidence: 'medium',
      }));
    }
  }

  // ── No parking environment specified ──
  if (parkingEnvironment.type === null) {
    reviews.push(
      review({
        field: 'parkingEnvironment.type',
        condition: 'Parking environment not specified',
        severity: 'warning',
        message: 'Parking environment not specified. Civil work scope cannot be accurately determined. Defaulting to minimal civil items.',
      }),
    );
  }

  return { items, reviews };
}

// ── 6. Permit & Design/Engineering Rules ───────────────────────

function permitDesignRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { permit, designEngineering } = input;

  // ── Permit Fees ──
  if (permit.responsibility === 'bullet' || permit.responsibility === null) {
    const permitItem = findPricebookItem('permit-fees');
    if (permitItem) {
      items.push(
        pricebookLine(permitItem, 1, {
          ruleName: 'Permit fees',
          ruleReason: 'Permit fees billed at actual cost + 10% markup. Final amount determined after permit submission.',
          sourceInputs: ['permit.responsibility'],
          confidence: 'high',
        }),
      );
    }
  }

  // ── Site Visit ──
  if (permit.responsibility === 'bullet' || permit.responsibility === null) {
    const siteVisitItem = findPricebookItem('deseng-site-walk');
    if (siteVisitItem) {
      items.push(
        pricebookLine(siteVisitItem, 1, {
          ruleName: 'Site visit',
          ruleReason: `Initial site evaluation at $${siteVisitItem.catalogPrice}. Can be credited back on project award.`,
          sourceInputs: ['permit.responsibility'],
          confidence: 'high',
        }),
      );
    }
  }

  // ── Permit Coordination ──
  if (permit.responsibility === 'bullet' || permit.responsibility === null) {
    const permitCoordItem = findPricebookItem('deseng-permit-coord');
    if (permitCoordItem) {
      items.push(
        pricebookLine(permitCoordItem, 1, {
          ruleName: 'Permit coordination',
          ruleReason: `Permit coordination and filing — up to 2 in-person visits at $${permitCoordItem.catalogPrice}.`,
          sourceInputs: ['permit.responsibility'],
          confidence: 'high',
        }),
      );
    }
  }

  // ── Engineered Plans ──
  if (designEngineering.responsibility === 'bullet' || designEngineering.responsibility === null) {
    const plansItem = findPricebookItem('deseng-stamped-plans');
    if (plansItem) {
      items.push(
        pricebookLine(plansItem, 1, {
          ruleName: 'Engineered stamped plans',
          ruleReason: `Stamped plan set. Catalog: $${plansItem.catalogPrice}, typical override: $${KNOWN_OVERRIDES['deseng-stamped-plans']?.typicalOverride}.`,
          sourceInputs: ['designEngineering.responsibility'],
        }),
      );
    }

    // Load calculations
    const loadCalcItem = findPricebookItem('deseng-load-calc');
    if (loadCalcItem) {
      items.push(
        pricebookLine(loadCalcItem, 1, {
          ruleName: 'Load calculations',
          ruleReason: `Load calculation. Catalog: $${loadCalcItem.catalogPrice}, typical override: $${KNOWN_OVERRIDES['deseng-load-calc']?.typicalOverride}.`,
          sourceInputs: ['designEngineering.responsibility'],
        }),
      );
    }

    // Utility coordination
    const utilCoordItem = findPricebookItem('deseng-utility-coord');
    if (utilCoordItem) {
      items.push(
        pricebookLine(utilCoordItem, 1, {
          ruleName: 'Utility coordination',
          ruleReason: `Up to 2 in-person visits at $${utilCoordItem.catalogPrice}`,
          sourceInputs: ['designEngineering.responsibility'],
        }),
      );
    }

    // Private utility mark-out
    const markoutItem = findPricebookItem('deseng-private-utility-markout');
    if (markoutItem) {
      items.push(
        pricebookLine(markoutItem, 1, {
          ruleName: 'Private utility mark-out',
          ruleReason: `Private utility mark-out at $${markoutItem.catalogPrice}. Free if public property.`,
          sourceInputs: ['designEngineering.responsibility'],
          confidence: 'medium',
        }),
      );
    }
  } else {
    reviews.push(
      review({
        field: 'designEngineering.responsibility',
        condition: 'Client handles design/engineering',
        severity: 'info',
        message: 'Design & engineering excluded — client responsibility.',
      }),
    );
  }

  return { items, reviews };
}

// ── 7. Network Rules ───────────────────────────────────────────

function networkRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { network } = input;

  if (network.type === 'none' || network.type === 'customer_lan' || network.type === 'included_in_package') {
    if (network.type === 'customer_lan') {
      reviews.push(
        review({
          field: 'network.type',
          condition: 'Customer LAN',
          severity: 'info',
          message: 'Network equipment excluded — customer providing LAN connectivity.',
        }),
      );
    }
    return { items, reviews };
  }

  if (network.type === 'cellular_router') {
    const routerItem = findPricebookItem('network-teltonika-rut-m50');
    if (routerItem) {
      items.push(
        pricebookLine(routerItem, 1, {
          ruleName: 'Cellular router',
          ruleReason: `Teltonika RUT M50 cellular router at $${routerItem.catalogPrice}`,
          sourceInputs: ['network.type'],
        }),
      );
    }
  }

  if (network.type === null) {
    reviews.push(
      review({
        field: 'network.type',
        condition: 'Network type not specified',
        severity: 'warning',
        message: 'Network connectivity type not specified. Cannot determine if router/enclosure/cabling is needed.',
      }),
    );
  }

  return { items, reviews };
}

// ── 8. Accessory Rules (Site Work) ─────────────────────────────

function accessoryRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { accessories, signageBollards, charger } = input;

  // ── Bollards ──
  const bollardQty = accessories.bollardQty > 0
    ? accessories.bollardQty
    : (signageBollards.responsibility === 'bollards' || signageBollards.responsibility === 'signage_bollards')
      ? charger.count * 2  // default 2 per charger
      : 0;

  if (bollardQty > 0) {
    const bollardItem = findPricebookItem('sitework-bollards');
    if (bollardItem) {
      items.push(
        pricebookLine(bollardItem, bollardQty, {
          ruleName: 'Safety bollards',
          ruleReason: `${bollardQty}x steel safety bollards at $${bollardItem.catalogPrice}/ea`,
          sourceInputs: ['accessories.bollardQty', 'signageBollards.responsibility', 'charger.count'],
          confidence: accessories.bollardQty > 0 ? 'high' : 'medium',
        }),
      );
    }
  }

  // ── Signage ──
  const signQty = accessories.signQty > 0
    ? accessories.signQty
    : (signageBollards.responsibility === 'signage' || signageBollards.responsibility === 'signage_bollards')
      ? charger.count  // 1 per charger
      : 0;

  if (signQty > 0) {
    const signItem = findPricebookItem('sitework-signage');
    if (signItem) {
      items.push(
        pricebookLine(signItem, signQty, {
          ruleName: 'EV signage',
          ruleReason: `${signQty}x EV signage at $${signItem.catalogPrice}/ea (per parking spot)`,
          sourceInputs: ['accessories.signQty', 'signageBollards.responsibility'],
          confidence: accessories.signQty > 0 ? 'high' : 'medium',
        }),
      );
    }
  }

  // ── Wheel Stops ──
  if (accessories.wheelStopQty > 0) {
    const wsItem = findPricebookItem('sitework-wheel-stops');
    if (wsItem) {
      items.push(
        pricebookLine(wsItem, accessories.wheelStopQty, {
          ruleName: 'Wheel stops',
          ruleReason: `${accessories.wheelStopQty}x wheel stops at $${wsItem.catalogPrice}/ea`,
          sourceInputs: ['accessories.wheelStopQty'],
        }),
      );
    }
  }

  // ── Misc Mounting Hardware ──
  const hardwareItem = findPricebookItem('material-mounting-hardware');
  if (hardwareItem) {
    items.push(
      pricebookLine(hardwareItem, charger.count, {
        ruleName: 'Mounting hardware',
        ruleReason: `${charger.count}x misc mounting hardware & BOS at $${hardwareItem.catalogPrice}/ea`,
        sourceInputs: ['charger.count'],
      }),
    );
  }

  return { items, reviews };
}

// ── 9. Safety Rules ────────────────────────────────────────────

function safetyRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { parkingEnvironment } = input;

  // Traffic control for most projects
  if (parkingEnvironment.trafficControlRequired !== false) {
    const tcItem = findPricebookItem('safety-traffic-control');
    if (tcItem) {
      items.push(
        pricebookLine(tcItem, 1, {
          ruleName: 'Traffic control & safety',
          ruleReason: `On-site traffic control, safety fence, trench plates at $${tcItem.catalogPrice}. Actual cost depends on site conditions and duration.`,
          sourceInputs: ['parkingEnvironment.trafficControlRequired'],
          confidence: 'medium',
        }),
      );
    }
  }

  return { items, reviews };
}

// ── 10. Remove & Replace Rules ─────────────────────────────────

function removeReplaceRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];

  if (
    input.project.projectType !== 'remove_replace' ||
    !input.removeReplace?.existingChargerCount
  ) {
    return { items, reviews };
  }

  const removalItem = findPricebookItem('eleclbr-removal');
  if (removalItem) {
    items.push(
      pricebookLine(removalItem, input.removeReplace.existingChargerCount, {
        ruleName: 'Charger removal',
        ruleReason: `${input.removeReplace.existingChargerCount}x removal of existing chargers at $${removalItem.catalogPrice}/ea`,
        sourceInputs: ['removeReplace.existingChargerCount'],
      }),
    );
  }

  return { items, reviews };
}

// ── 11. Software Rules ─────────────────────────────────────────

function softwareRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { charger } = input;

  // ChargePoint software only applies to ChargePoint chargers
  if (!charger.brand.toLowerCase().includes('chargepoint')) {
    return { items, reviews };
  }

  if (charger.model.toLowerCase().includes('cpf50') || charger.model.toLowerCase().includes('cpf')) {
    const activationItem = findPricebookItem('software-cp-fleet-activation');
    const cloudItem = findPricebookItem('software-cp-cloud-1yr');

    if (activationItem) {
      items.push(
        pricebookLine(activationItem, charger.count, {
          ruleName: 'ChargePoint activation',
          ruleReason: `${charger.count}x CPF activation at $${activationItem.catalogPrice}/ea`,
          sourceInputs: ['charger.brand', 'charger.model'],
        }),
      );
    }
    if (cloudItem) {
      items.push(
        pricebookLine(cloudItem, charger.count, {
          ruleName: 'ChargePoint cloud software',
          ruleReason: `${charger.count}x 1-year prepaid cloud management at $${cloudItem.catalogPrice}/ea`,
          sourceInputs: ['charger.brand', 'charger.model'],
        }),
      );
    }
  }

  return { items, reviews };
}

// ── 12. Service Fee Rules (Supercharger only) ──────────────────

function serviceFeeRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];

  const isSupercharger =
    input.charger.brand.toLowerCase().includes('tesla') &&
    (input.charger.model.toLowerCase().includes('supercharger') ||
      input.charger.chargingLevel === 'l3_dcfc' ||
      input.project.projectType === 'supercharger');

  if (!isSupercharger) return { items, reviews };

  const fee = SERVICE_FEES[0]; // Public PPU default
  items.push(
    line({
      category: 'SOFTWARE',
      description: `Tesla Turnkey O&M Service — ${fee.name} (${fee.unit})`,
      quantity: input.charger.count,
      unit: 'stall',
      unitPrice: 0,
      pricingSource: 'catalog',
      ruleName: 'Tesla recurring service fee (informational)',
      ruleReason: `Recurring fee of $${fee.rate}${fee.unit} per stall. Not included in one-time estimate total — shown for reference.`,
      sourceInputs: ['charger.brand', 'charger.chargingLevel'],
      manualReviewRequired: false,
      confidence: 'high',
    }),
  );

  return { items, reviews };
}

// ============================================================
// Run All Rules
// ============================================================

export function runAllRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  _counters = createCounters();

  const allItems: EstimateLineItem[] = [];
  const allReviews: ManualReviewTrigger[] = [];

  // Guard: zero charger count
  if (!input.charger?.count || input.charger.count <= 0) {
    allReviews.push(
      review({
        field: 'charger.count',
        condition: 'Zero or missing charger count',
        severity: 'critical',
        message: 'Charger count is 0 or not provided. Estimate cannot be generated.',
      }),
    );
    return { items: allItems, reviews: allReviews };
  }

  const rulesets = [
    chargerHardwareRules,
    pedestalRules,
    installLaborRules,
    electricalRules,
    civilRules,
    permitDesignRules,
    networkRules,
    accessoryRules,
    safetyRules,
    removeReplaceRules,
    softwareRules,
    serviceFeeRules,
  ];

  for (const ruleset of rulesets) {
    const { items, reviews } = ruleset(input);
    allItems.push(...items);
    allReviews.push(...reviews);
  }

  return { items: allItems, reviews: allReviews };
}

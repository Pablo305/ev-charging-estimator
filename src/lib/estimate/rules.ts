import {
  EstimateInput,
  EstimateLineItem,
  ManualReviewTrigger,
} from './types';
import {
  TESLA_UWC_ITEMS,
  CHARGEPOINT_ITEMS,
  PEDESTAL_PRICING,
  INSTALLATION_COSTS,
  ACCESSORY_PRICES,
  findSuperchargerPackage,
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

// Module-level counters scoped per generateEstimate call
let _counters: IdCounters = createCounters();

function line(
  partial: Omit<EstimateLineItem, 'id' | 'extendedPrice'>,
): EstimateLineItem {
  return {
    ...partial,
    id: _counters.nextLineId(),
    extendedPrice: partial.quantity * partial.unitPrice,
  };
}

function review(
  partial: Omit<ManualReviewTrigger, 'id'>,
): ManualReviewTrigger {
  return { ...partial, id: _counters.nextReviewId() };
}

// ============================================================
// Rule Categories
// ============================================================

// ── 1. Charger Hardware Rules ────────────────────────────────

function chargerHardwareRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { charger, estimateControls, purchasingChargers } = input;
  const isBulk = estimateControls.pricingTier === 'bulk_discount';

  // If customer supplies chargers, skip hardware but note it
  if (charger.isCustomerSupplied || purchasingChargers.responsibility === 'client') {
    reviews.push(
      review({
        field: 'charger.isCustomerSupplied',
        condition: 'Customer-supplied chargers',
        severity: 'info',
        message:
          'Charger hardware excluded from estimate - customer is supplying equipment.',
      }),
    );
    return { items, reviews };
  }

  const brandLower = charger.brand.toLowerCase();
  const modelLower = charger.model.toLowerCase();

  // ── Tesla Supercharger ──
  if (
    brandLower.includes('tesla') &&
    (modelLower.includes('supercharger') || charger.chargingLevel === 'l3_dcfc')
  ) {
    const pkg = findSuperchargerPackage(charger.count);
    if (pkg) {
      const price = isBulk
        ? pkg.bulkPrice ?? pkg.msrpPrice ?? 0
        : pkg.msrpPrice ?? 0;
      items.push(
        line({
          category: 'CHARGER',
          description: `${pkg.description} (${isBulk ? 'Bulk' : 'MSRP'})`,
          quantity: 1,
          unit: 'package',
          unitPrice: price,
          pricingSource: isBulk ? 'catalog_bulk' : 'catalog_msrp',
          ruleName: 'charger-supercharger-package',
          ruleReason: `Selected ${pkg.model} package for ${charger.count} stalls. Price from Tesla commercial workbook.`,
          sourceInputs: [
            'charger.brand',
            'charger.model',
            'charger.count',
            'estimateControls.pricingTier',
          ],
          manualReviewRequired: false,
          confidence: 'high',
        }),
      );
      if (pkg.availability !== 'available') {
        reviews.push(
          review({
            field: 'charger.model',
            condition: `Package availability: ${pkg.availability}`,
            severity: 'warning',
            message: `${pkg.model} is not yet available (${pkg.availability}). Verify delivery timeline.`,
          }),
        );
      }
      if (pkg.stallCount !== charger.count) {
        reviews.push(
          review({
            field: 'charger.count',
            condition: `Requested ${charger.count} stalls, nearest package is ${pkg.stallCount}`,
            severity: 'warning',
            message: `No exact ${charger.count}-stall package exists. Using ${pkg.stallCount}-stall package. Verify with customer.`,
          }),
        );
      }
    } else {
      items.push(
        line({
          category: 'CHARGER',
          description: `Tesla Supercharger - ${charger.count} stalls (custom configuration)`,
          quantity: 1,
          unit: 'package',
          unitPrice: 0,
          pricingSource: 'tbd',
          ruleName: 'charger-supercharger-custom',
          ruleReason:
            'No standard package matches this stall count. Requires custom Tesla quote.',
          sourceInputs: ['charger.brand', 'charger.count'],
          manualReviewRequired: true,
          manualReviewReason: 'No matching Supercharger package - needs custom quote',
          confidence: 'low',
        }),
      );
      reviews.push(
        review({
          field: 'charger.count',
          condition: 'No matching Supercharger package',
          severity: 'critical',
          message: `No standard Supercharger package for ${charger.count} stalls. Must obtain custom quote from Tesla.`,
        }),
      );
    }
    return { items, reviews };
  }

  // ── Tesla UWC (L2) ──
  if (
    brandLower.includes('tesla') &&
    (modelLower.includes('uwc') ||
      modelLower.includes('wall connector') ||
      modelLower.includes('universal'))
  ) {
    const uwc = TESLA_UWC_ITEMS[0];
    const price = isBulk
      ? uwc.bulkPrice ?? uwc.msrpPrice ?? 0
      : uwc.msrpPrice ?? 0;
    items.push(
      line({
        category: 'CHARGER',
        description: `${uwc.description} (${isBulk ? 'Bulk Est.' : 'MSRP Est.'})`,
        quantity: charger.count,
        unit: 'each',
        unitPrice: price,
        pricingSource: 'industry_standard',
        ruleName: 'charger-tesla-uwc',
        ruleReason:
          'Tesla UWC pricing is an industry estimate (not in Tesla commercial workbook). Verify with Tesla rep.',
        sourceInputs: [
          'charger.brand',
          'charger.model',
          'charger.count',
          'estimateControls.pricingTier',
        ],
        manualReviewRequired: true,
        manualReviewReason: 'UWC pricing is estimated - verify with Tesla',
        confidence: 'medium',
      }),
    );
    return { items, reviews };
  }

  // ── ChargePoint ──
  if (brandLower.includes('chargepoint')) {
    const match = CHARGEPOINT_ITEMS.find((cp) =>
      modelLower.includes(cp.model.toLowerCase()),
    );
    if (match) {
      const price = match.msrpPrice ?? 0;
      items.push(
        line({
          category: 'CHARGER',
          description: `${match.description}`,
          quantity: charger.count,
          unit: 'each',
          unitPrice: price,
          pricingSource: price > 0 ? 'industry_standard' : 'tbd',
          ruleName: 'charger-chargepoint-model',
          ruleReason: `ChargePoint ${match.model} pricing is an industry estimate. Verify with ChargePoint rep.`,
          sourceInputs: ['charger.brand', 'charger.model', 'charger.count'],
          manualReviewRequired: true,
          manualReviewReason:
            'ChargePoint pricing is estimated - verify with rep',
          confidence: 'medium',
        }),
      );
    } else {
      items.push(
        line({
          category: 'CHARGER',
          description: `ChargePoint ${charger.model} (pricing TBD)`,
          quantity: charger.count,
          unit: 'each',
          unitPrice: 0,
          pricingSource: 'tbd',
          ruleName: 'charger-chargepoint-unknown',
          ruleReason:
            'Unknown ChargePoint model - no catalog pricing available.',
          sourceInputs: ['charger.brand', 'charger.model'],
          manualReviewRequired: true,
          manualReviewReason: 'Unknown model - needs manual pricing',
          confidence: 'low',
        }),
      );
      reviews.push(
        review({
          field: 'charger.model',
          condition: 'Unknown ChargePoint model',
          severity: 'critical',
          message: `ChargePoint model "${charger.model}" not found in catalog. Manual pricing required.`,
        }),
      );
    }
    return { items, reviews };
  }

  // ── Other / Unknown brand ──
  items.push(
    line({
      category: 'CHARGER',
      description: `${charger.brand} ${charger.model} (pricing TBD)`,
      quantity: charger.count,
      unit: 'each',
      unitPrice: 0,
      pricingSource: 'tbd',
      ruleName: 'charger-unknown-brand',
      ruleReason: `Brand "${charger.brand}" is not in the pricing catalog. Manual quote required.`,
      sourceInputs: ['charger.brand', 'charger.model', 'charger.count'],
      manualReviewRequired: true,
      manualReviewReason: `No catalog pricing for ${charger.brand}`,
      confidence: 'low',
    }),
  );
  reviews.push(
    review({
      field: 'charger.brand',
      condition: 'Brand not in catalog',
      severity: 'critical',
      message: `Brand "${charger.brand}" not found in pricing catalog. Must obtain quote.`,
    }),
  );
  return { items, reviews };
}

// ── 2. Pedestal Rules ────────────────────────────────────────

function pedestalRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { charger } = input;

  if (
    charger.mountType === 'pedestal' ||
    charger.mountType === 'mix' ||
    charger.pedestalCount > 0
  ) {
    const qty =
      charger.pedestalCount > 0 ? charger.pedestalCount : charger.count;
    const isTesla = charger.brand.toLowerCase().includes('tesla');
    const price = isTesla
      ? PEDESTAL_PRICING.tesla_roi.price
      : PEDESTAL_PRICING.l2_typical_mid.price;
    const source = isTesla ? 'Tesla ROI calculator' : 'industry mid-range';

    items.push(
      line({
        category: 'PEDESTAL',
        description: `Charger Pedestal/Mounting Post (${source})`,
        quantity: qty,
        unit: 'each',
        unitPrice: price,
        pricingSource: 'industry_standard',
        ruleName: 'pedestal-mount',
        ruleReason: `${qty} pedestals based on mount type "${charger.mountType}" and pedestal count. Price from ${source}.`,
        sourceInputs: [
          'charger.mountType',
          'charger.pedestalCount',
          'charger.brand',
        ],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
  }

  return { items, reviews };
}

// ── 3. Parking Environment / Civil Rules ─────────────────────

function civilRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { parkingEnvironment, electrical, charger } = input;
  const costs = INSTALLATION_COSTS;

  // Mixed environment → force manual review on all civil items
  if (parkingEnvironment.type === 'mixed') {
    reviews.push(
      review({
        field: 'parkingEnvironment.type',
        condition: 'Mixed parking environment',
        severity: 'critical',
        message:
          'Mixed parking environment (garage + surface lot) requires site visit for accurate civil estimate. All civil line items flagged for manual review.',
      }),
    );
  }

  // ── Garage-specific ──
  if (
    parkingEnvironment.type === 'parking_garage' ||
    parkingEnvironment.type === 'mixed'
  ) {
    // PT Slab scan
    if (
      parkingEnvironment.hasPTSlab === true ||
      parkingEnvironment.hasPTSlab === null
    ) {
      items.push(
        line({
          category: 'CIVIL',
          description: 'Post-Tension Slab Scan (GPR)',
          quantity: 1,
          unit: 'lump sum',
          unitPrice: costs.slabScan.mid,
          pricingSource: 'industry_standard',
          ruleName: 'civil-slab-scan',
          ruleReason:
            parkingEnvironment.hasPTSlab === null
              ? 'PT slab status unknown - including slab scan as precaution. If confirmed non-PT, this can be removed.'
              : 'PT slab confirmed or suspected - GPR scan required before any penetrations.',
          sourceInputs: [
            'parkingEnvironment.type',
            'parkingEnvironment.hasPTSlab',
          ],
          manualReviewRequired: parkingEnvironment.hasPTSlab === null,
          manualReviewReason:
            parkingEnvironment.hasPTSlab === null
              ? 'PT slab status unknown - verify before finalizing'
              : undefined,
          confidence: parkingEnvironment.hasPTSlab === null ? 'low' : 'medium',
        }),
      );
      if (parkingEnvironment.hasPTSlab === null) {
        reviews.push(
          review({
            field: 'parkingEnvironment.hasPTSlab',
            condition: 'PT slab status unknown',
            severity: 'warning',
            message:
              'Post-tension slab status is unknown. If the garage has PT cables, core drilling locations are restricted. Request structural drawings.',
          }),
        );
      }
    }

    // Core drilling
    if (
      parkingEnvironment.coringRequired === true ||
      parkingEnvironment.coringRequired === null
    ) {
      const coreQty = Math.max(charger.count, 2);
      items.push(
        line({
          category: 'CIVIL',
          description: 'Core Drilling Through Concrete Deck',
          quantity: coreQty,
          unit: 'each',
          unitPrice: costs.coreDrilling.mid,
          pricingSource: 'industry_standard',
          ruleName: 'civil-core-drilling',
          ruleReason: `Estimated ${coreQty} core penetrations for conduit routing through garage deck.`,
          sourceInputs: [
            'parkingEnvironment.coringRequired',
            'charger.count',
          ],
          manualReviewRequired: parkingEnvironment.type === 'mixed',
          manualReviewReason:
            parkingEnvironment.type === 'mixed'
              ? 'Mixed environment - verify core locations'
              : undefined,
          confidence: 'medium',
        }),
      );
    }

    // Fire-rated penetrations
    if (parkingEnvironment.fireRatedPenetrations === true) {
      items.push(
        line({
          category: 'CIVIL',
          description: 'Fire-Rated Penetration Sealing',
          quantity: Math.max(charger.count, 2),
          unit: 'each',
          unitPrice: costs.fireRatedPenetration.mid,
          pricingSource: 'industry_standard',
          ruleName: 'civil-fire-penetration',
          ruleReason:
            'Fire-rated assembly penetrations require firestop sealant per building code.',
          sourceInputs: ['parkingEnvironment.fireRatedPenetrations'],
          manualReviewRequired: false,
          confidence: 'medium',
        }),
      );
    }
  }

  // ── Surface lot specific ──
  if (
    parkingEnvironment.type === 'surface_lot' ||
    parkingEnvironment.type === 'mixed'
  ) {
    const distance = electrical.distanceToPanel_ft ?? 75;

    // Trenching
    if (
      parkingEnvironment.trenchingRequired === true ||
      parkingEnvironment.trenchingRequired === null
    ) {
      items.push(
        line({
          category: 'CIVIL',
          description: `Trenching (${parkingEnvironment.surfaceType ?? 'unknown surface'})`,
          quantity: distance,
          unit: 'linear ft',
          unitPrice: costs.trenchingPerFt.mid,
          pricingSource: 'industry_standard',
          ruleName: 'civil-trenching',
          ruleReason: `Trenching estimated at ${distance}ft based on panel distance. Surface type: ${parkingEnvironment.surfaceType ?? 'unknown'}.`,
          sourceInputs: [
            'parkingEnvironment.trenchingRequired',
            'electrical.distanceToPanel_ft',
            'parkingEnvironment.surfaceType',
          ],
          manualReviewRequired:
            parkingEnvironment.trenchingRequired === null ||
            parkingEnvironment.type === 'mixed',
          manualReviewReason: 'Trenching need/distance not confirmed',
          confidence:
            parkingEnvironment.trenchingRequired === null ? 'low' : 'medium',
        }),
      );
    }

    // Boring
    if (parkingEnvironment.boringRequired === true) {
      const boringDist = Math.min(distance, 50);
      items.push(
        line({
          category: 'CIVIL',
          description: 'Directional Boring (under obstacles)',
          quantity: boringDist,
          unit: 'linear ft',
          unitPrice: costs.boringPerFt.mid,
          pricingSource: 'industry_standard',
          ruleName: 'civil-boring',
          ruleReason: `Boring required for ${boringDist}ft to pass under obstacles (sidewalks, driveways, etc.)`,
          sourceInputs: ['parkingEnvironment.boringRequired'],
          manualReviewRequired: false,
          confidence: 'medium',
        }),
      );
    }

    // Surface restoration
    if (
      parkingEnvironment.trenchingRequired === true ||
      parkingEnvironment.trenchingRequired === null
    ) {
      items.push(
        line({
          category: 'SITE_WORK',
          description: `Surface Restoration (${parkingEnvironment.surfaceType ?? 'asphalt'} patching)`,
          quantity: distance,
          unit: 'linear ft',
          unitPrice: 15,
          pricingSource: 'industry_standard',
          ruleName: 'civil-surface-restore',
          ruleReason:
            'Trench restoration included for trenched areas. Assumes standard 24" wide trench patch.',
          sourceInputs: ['parkingEnvironment.surfaceType'],
          manualReviewRequired: false,
          confidence: 'medium',
        }),
      );
    }
  }

  // Concrete pad
  if (input.accessories.padRequired) {
    const padPrice = ACCESSORY_PRICES.find((a) => a.id === 'acc-pad');
    items.push(
      line({
        category: 'CIVIL',
        description: 'Concrete Charging Pad',
        quantity: charger.count,
        unit: 'each',
        unitPrice: padPrice?.midPrice ?? 2750,
        pricingSource: 'industry_standard',
        ruleName: 'civil-concrete-pad',
        ruleReason:
          'Concrete pads requested for charger mounting locations.',
        sourceInputs: ['accessories.padRequired', 'charger.count'],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
  }

  // Traffic control
  if (parkingEnvironment.trafficControlRequired === true) {
    items.push(
      line({
        category: 'SAFETY',
        description: 'Traffic Control / Flagging (estimated 3 days)',
        quantity: 3,
        unit: 'days',
        unitPrice: costs.trafficControl.mid,
        pricingSource: 'industry_standard',
        ruleName: 'civil-traffic-control',
        ruleReason:
          'Traffic control flagging needed during civil work in active parking areas.',
        sourceInputs: ['parkingEnvironment.trafficControlRequired'],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
  }

  // Debris removal
  if (input.accessories.debrisRemoval) {
    items.push(
      line({
        category: 'SITE_WORK',
        description: 'Debris Removal and Site Cleanup',
        quantity: 1,
        unit: 'lump sum',
        unitPrice: costs.debrisRemoval.mid,
        pricingSource: 'industry_standard',
        ruleName: 'civil-debris-removal',
        ruleReason: 'Post-construction debris removal and site cleanup.',
        sourceInputs: ['accessories.debrisRemoval'],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
  }

  return { items, reviews };
}

// ── 4. Electrical Rules ──────────────────────────────────────

function electricalRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { electrical, charger, makeReady } = input;
  const costs = INSTALLATION_COSTS;

  // Skip electrical if not Bullet's responsibility
  if (makeReady.responsibility === 'client') {
    reviews.push(
      review({
        field: 'makeReady.responsibility',
        condition: 'Client-responsible make-ready',
        severity: 'info',
        message:
          'Electrical make-ready is client responsibility. Electrical materials/labor excluded.',
      }),
    );
    return { items, reviews };
  }

  const distance = electrical.distanceToPanel_ft ?? 75;
  const isLongRun = distance > 100;

  // Unknown capacity
  if (!electrical.availableCapacityKnown) {
    reviews.push(
      review({
        field: 'electrical.availableCapacityKnown',
        condition: 'Electrical capacity unknown',
        severity: 'critical',
        message:
          'Available electrical capacity is unknown. A load calculation or utility survey is required before finalizing the estimate.',
      }),
    );
    // Add load calculation
    items.push(
      line({
        category: 'ELEC_LBR',
        description: 'Electrical Load Calculation',
        quantity: 1,
        unit: 'lump sum',
        unitPrice: costs.loadCalc.mid,
        pricingSource: 'industry_standard',
        ruleName: 'elec-load-calc',
        ruleReason:
          'Electrical capacity is unknown - load calculation included to determine available capacity.',
        sourceInputs: ['electrical.availableCapacityKnown'],
        manualReviewRequired: true,
        manualReviewReason: 'Capacity unknown - load calc required first',
        confidence: 'medium',
      }),
    );
  }

  // Conduit
  const conduitMultiplier = isLongRun ? 1.15 : 1.0; // 15% extra for long runs
  items.push(
    line({
      category: 'ELEC_MAT',
      description: `Conduit Run (EMT/rigid, ${distance}ft)`,
      quantity: Math.ceil(distance * conduitMultiplier),
      unit: 'linear ft',
      unitPrice: costs.conduitPerFt.mid,
      pricingSource: 'industry_standard',
      ruleName: 'elec-conduit',
      ruleReason: `Conduit for ${distance}ft run from panel to charger location.${isLongRun ? ' Long run (>100ft) - added 15% for fittings/bends.' : ''}`,
      sourceInputs: ['electrical.distanceToPanel_ft'],
      manualReviewRequired: electrical.distanceToPanel_ft === null,
      manualReviewReason:
        electrical.distanceToPanel_ft === null
          ? 'Distance to panel not specified - using 75ft estimate'
          : undefined,
      confidence: electrical.distanceToPanel_ft !== null ? 'medium' : 'low',
    }),
  );

  // Wire
  const wireGaugeFactor =
    electrical.serviceType === '480v_3phase' ? 1.5 : 1.0;
  items.push(
    line({
      category: 'ELEC_MAT',
      description: `Wire/Cable (${electrical.serviceType ?? 'TBD voltage'})`,
      quantity: Math.ceil(distance * conduitMultiplier),
      unit: 'linear ft',
      unitPrice: Math.round(costs.wirePerFt.mid * wireGaugeFactor),
      pricingSource: 'industry_standard',
      ruleName: 'elec-wire',
      ruleReason: `Wire sized for ${electrical.serviceType ?? 'unknown'} service.${wireGaugeFactor > 1 ? ' 480V 3-phase requires heavier gauge - 1.5x cost factor applied.' : ''}`,
      sourceInputs: [
        'electrical.serviceType',
        'electrical.distanceToPanel_ft',
      ],
      manualReviewRequired: electrical.serviceType === null || electrical.serviceType === 'unknown',
      manualReviewReason: 'Service type unknown - wire gauge cannot be determined',
      confidence: electrical.serviceType !== null && electrical.serviceType !== 'unknown' ? 'medium' : 'low',
    }),
  );

  // Electrical labor
  const laborHours =
    charger.count * 8 + Math.ceil(distance / 20) * 2 + (isLongRun ? 8 : 0);
  items.push(
    line({
      category: 'ELEC_LBR',
      description: 'Electrical Installation Labor',
      quantity: laborHours,
      unit: 'hours',
      unitPrice: costs.electricalLabor.mid,
      pricingSource: 'industry_standard',
      ruleName: 'elec-labor',
      ruleReason: `Estimated ${laborHours} hours: ${charger.count} chargers x 8hr + distance factor + ${isLongRun ? 'long run premium' : 'standard'}.`,
      sourceInputs: ['charger.count', 'electrical.distanceToPanel_ft'],
      manualReviewRequired: false,
      confidence: 'medium',
    }),
  );

  // Breakers
  if (electrical.breakerSpaceAvailable !== false) {
    items.push(
      line({
        category: 'ELEC_MAT',
        description: `Circuit Breakers (${charger.ampsPerCharger ?? 40}A)`,
        quantity: charger.count,
        unit: 'each',
        unitPrice: 150,
        pricingSource: 'industry_standard',
        ruleName: 'elec-breakers',
        ruleReason: `${charger.count} breakers for individual charger circuits.`,
        sourceInputs: [
          'charger.count',
          'charger.ampsPerCharger',
          'electrical.breakerSpaceAvailable',
        ],
        manualReviewRequired: electrical.breakerSpaceAvailable === null,
        manualReviewReason: 'Breaker space availability unknown',
        confidence: 'medium',
      }),
    );
  }

  // Panel upgrade
  if (electrical.panelUpgradeRequired === true) {
    items.push(
      line({
        category: 'ELEC_MAT',
        description: 'Electrical Panel Upgrade',
        quantity: 1,
        unit: 'lump sum',
        unitPrice: costs.panelUpgrade.mid,
        pricingSource: 'industry_standard',
        ruleName: 'elec-panel-upgrade',
        ruleReason:
          'Panel upgrade required to accommodate additional charging load.',
        sourceInputs: ['electrical.panelUpgradeRequired'],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
  } else if (electrical.panelUpgradeRequired === null) {
    reviews.push(
      review({
        field: 'electrical.panelUpgradeRequired',
        condition: 'Panel upgrade need unknown',
        severity: 'warning',
        message:
          'Panel upgrade requirement is unknown. Load calculation will determine if upgrade is needed.',
      }),
    );
  }

  // Transformer
  if (electrical.transformerRequired === true) {
    items.push(
      line({
        category: 'ELEC_MAT',
        description: 'Step-Down Transformer',
        quantity: 1,
        unit: 'lump sum',
        unitPrice: costs.transformer.mid,
        pricingSource: 'industry_standard',
        ruleName: 'elec-transformer',
        ruleReason:
          'Transformer required for voltage conversion to charger requirements.',
        sourceInputs: ['electrical.transformerRequired'],
        manualReviewRequired: true,
        manualReviewReason:
          'Transformer sizing depends on total load - verify with engineer',
        confidence: 'medium',
      }),
    );
  }

  // Switchgear
  if (electrical.switchgearRequired === true) {
    items.push(
      line({
        category: 'ELEC_MAT',
        description: 'Switchgear / Distribution Equipment',
        quantity: 1,
        unit: 'lump sum',
        unitPrice: costs.switchgear.mid,
        pricingSource: 'industry_standard',
        ruleName: 'elec-switchgear',
        ruleReason: 'Switchgear required for load distribution.',
        sourceInputs: ['electrical.switchgearRequired'],
        manualReviewRequired: true,
        manualReviewReason: 'Switchgear spec depends on total load',
        confidence: 'medium',
      }),
    );
  }

  return { items, reviews };
}

// ── 5. Permit / Design Engineering Rules ─────────────────────

function permitDesignRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { permit, designEngineering } = input;
  const costs = INSTALLATION_COSTS;

  // Permit
  if (permit.responsibility === 'bullet') {
    items.push(
      line({
        category: 'PERMIT',
        description: 'Permit Filing and Management',
        quantity: 1,
        unit: 'lump sum',
        unitPrice: 1_500,
        pricingSource: 'industry_standard',
        ruleName: 'permit-labor',
        ruleReason:
          'Bullet Energy handles permit filing. Includes application prep, submission, and inspection coordination.',
        sourceInputs: ['permit.responsibility'],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
    const feeAmount = permit.feeAllowance ?? costs.permitFee.mid;
    items.push(
      line({
        category: 'PERMIT',
        description: 'Permit Fee Allowance',
        quantity: 1,
        unit: 'allowance',
        unitPrice: feeAmount,
        pricingSource:
          permit.feeAllowance !== null ? 'allowance' : 'industry_standard',
        ruleName: 'permit-fee',
        ruleReason:
          permit.feeAllowance !== null
            ? `Permit fee allowance of $${feeAmount} specified in SOW.`
            : `No permit fee specified - using industry average of $${feeAmount}.`,
        sourceInputs: ['permit.responsibility', 'permit.feeAllowance'],
        manualReviewRequired: permit.feeAllowance === null,
        manualReviewReason: 'Permit fee not specified - using estimate',
        confidence: permit.feeAllowance !== null ? 'high' : 'low',
      }),
    );
  } else if (permit.responsibility === 'tbd') {
    reviews.push(
      review({
        field: 'permit.responsibility',
        condition: 'Permit responsibility TBD',
        severity: 'warning',
        message:
          'Permit responsibility not determined. Clarify with customer before finalizing.',
      }),
    );
  }

  // Design / Engineering
  if (designEngineering.responsibility === 'bullet') {
    if (designEngineering.stampedPlansRequired === true) {
      items.push(
        line({
          category: 'DES/ENG',
          description: 'Stamped Engineering Plans (PE)',
          quantity: 1,
          unit: 'lump sum',
          unitPrice: costs.engineeringPlans.mid,
          pricingSource: 'industry_standard',
          ruleName: 'design-stamped-plans',
          ruleReason:
            'PE-stamped plans required by jurisdiction. Includes electrical and site plans.',
          sourceInputs: [
            'designEngineering.responsibility',
            'designEngineering.stampedPlansRequired',
          ],
          manualReviewRequired: false,
          confidence: 'medium',
        }),
      );
    } else {
      items.push(
        line({
          category: 'DES/ENG',
          description: 'Design & Engineering (non-stamped)',
          quantity: 1,
          unit: 'lump sum',
          unitPrice: Math.round(costs.engineeringPlans.mid * 0.6),
          pricingSource: 'industry_standard',
          ruleName: 'design-basic',
          ruleReason:
            'Basic design package (no PE stamp). Includes site layout, electrical design, and as-built documentation.',
          sourceInputs: ['designEngineering.responsibility'],
          manualReviewRequired: designEngineering.stampedPlansRequired === null,
          manualReviewReason: 'Stamped plan requirement not confirmed',
          confidence: 'medium',
        }),
      );
    }
  }

  return { items, reviews };
}

// ── 6. Network Rules ─────────────────────────────────────────

function networkRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { network } = input;
  const costs = INSTALLATION_COSTS;

  if (network.type === 'none' || network.type === 'included_in_package') {
    return { items, reviews };
  }

  if (network.type === 'customer_lan') {
    reviews.push(
      review({
        field: 'network.type',
        condition: 'Customer LAN - no network hardware',
        severity: 'info',
        message:
          'Customer providing LAN connection. No network hardware included in estimate.',
      }),
    );
    return { items, reviews };
  }

  if (network.type === 'cellular_router') {
    items.push(
      line({
        category: 'NETWORK',
        description: 'Cellular Router (4G/5G)',
        quantity: 1,
        unit: 'each',
        unitPrice: costs.cellularRouter.mid,
        pricingSource: 'industry_standard',
        ruleName: 'network-cellular-router',
        ruleReason:
          'Cellular router for charger connectivity where LAN/WiFi unavailable.',
        sourceInputs: ['network.type'],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
    items.push(
      line({
        category: 'NETWORK',
        description: 'Router NEMA Enclosure',
        quantity: 1,
        unit: 'each',
        unitPrice: costs.routerEnclosure.mid,
        pricingSource: 'industry_standard',
        ruleName: 'network-enclosure',
        ruleReason: 'Weatherproof enclosure for outdoor cellular router.',
        sourceInputs: ['network.type'],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
    items.push(
      line({
        category: 'NETWORK',
        description: 'Network Equipment Installation',
        quantity: 1,
        unit: 'lump sum',
        unitPrice: costs.networkInstallLabor.mid,
        pricingSource: 'industry_standard',
        ruleName: 'network-install-labor',
        ruleReason:
          'Labor to mount, wire, and configure cellular router and charger network.',
        sourceInputs: ['network.type'],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
  }

  if (network.type === 'wifi_bridge') {
    items.push(
      line({
        category: 'NETWORK',
        description: 'WiFi Bridge Equipment',
        quantity: 1,
        unit: 'each',
        unitPrice: costs.wifiBridge.mid,
        pricingSource: 'industry_standard',
        ruleName: 'network-wifi-bridge',
        ruleReason: 'WiFi bridge to extend building network to charger area.',
        sourceInputs: ['network.type'],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
    items.push(
      line({
        category: 'NETWORK',
        description: 'WiFi Bridge Installation',
        quantity: 1,
        unit: 'lump sum',
        unitPrice: costs.networkInstallLabor.mid,
        pricingSource: 'industry_standard',
        ruleName: 'network-wifi-install',
        ruleReason: 'Labor to install and configure WiFi bridge.',
        sourceInputs: ['network.type'],
        manualReviewRequired:
          network.wifiInstallResponsibility === 'tbd',
        manualReviewReason: 'WiFi install responsibility TBD',
        confidence: 'medium',
      }),
    );
  }

  if (network.type === null) {
    reviews.push(
      review({
        field: 'network.type',
        condition: 'Network type not specified',
        severity: 'warning',
        message:
          'Network/connectivity type not specified. Determine if chargers require network connection.',
      }),
    );
  }

  return { items, reviews };
}

// ── 7. Accessory Rules ───────────────────────────────────────

function accessoryRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { accessories, signageBollards, charger } = input;

  // Bollards
  const bollardQty = accessories.bollardQty;
  if (bollardQty > 0) {
    const price = ACCESSORY_PRICES.find((a) => a.id === 'acc-bollard');
    items.push(
      line({
        category: 'MATERIAL',
        description: 'Safety Bollard (installed)',
        quantity: bollardQty,
        unit: 'each',
        unitPrice: price?.midPrice ?? 375,
        pricingSource: 'industry_standard',
        ruleName: 'acc-bollards',
        ruleReason: `${bollardQty} bollards for charger station protection.`,
        sourceInputs: ['accessories.bollardQty'],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
  } else if (
    signageBollards.responsibility === 'bollards' ||
    signageBollards.responsibility === 'signage_bollards'
  ) {
    // Default 2 per charger if responsibility says bollards but no qty
    const defaultQty = charger.count * 2;
    const price = ACCESSORY_PRICES.find((a) => a.id === 'acc-bollard');
    items.push(
      line({
        category: 'MATERIAL',
        description: 'Safety Bollard (installed, estimated qty)',
        quantity: defaultQty,
        unit: 'each',
        unitPrice: price?.midPrice ?? 375,
        pricingSource: 'industry_standard',
        ruleName: 'acc-bollards-default',
        ruleReason: `Bollard responsibility assigned but no qty specified. Estimated ${defaultQty} (2 per charger).`,
        sourceInputs: [
          'signageBollards.responsibility',
          'charger.count',
        ],
        manualReviewRequired: true,
        manualReviewReason: 'Bollard quantity estimated - verify with site survey',
        confidence: 'low',
      }),
    );
  }

  // Signs
  const signQty = accessories.signQty;
  if (signQty > 0) {
    const price = ACCESSORY_PRICES.find((a) => a.id === 'acc-sign');
    items.push(
      line({
        category: 'MATERIAL',
        description: 'EV Charging Sign (installed)',
        quantity: signQty,
        unit: 'each',
        unitPrice: price?.midPrice ?? 275,
        pricingSource: 'industry_standard',
        ruleName: 'acc-signs',
        ruleReason: `${signQty} EV charging signs.`,
        sourceInputs: ['accessories.signQty'],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
  } else if (
    signageBollards.responsibility === 'signage' ||
    signageBollards.responsibility === 'signage_bollards'
  ) {
    const defaultQty = charger.count;
    const price = ACCESSORY_PRICES.find((a) => a.id === 'acc-sign');
    items.push(
      line({
        category: 'MATERIAL',
        description: 'EV Charging Sign (installed, estimated qty)',
        quantity: defaultQty,
        unit: 'each',
        unitPrice: price?.midPrice ?? 275,
        pricingSource: 'industry_standard',
        ruleName: 'acc-signs-default',
        ruleReason: `Sign responsibility assigned but no qty specified. Estimated ${defaultQty} (1 per charger).`,
        sourceInputs: ['signageBollards.responsibility', 'charger.count'],
        manualReviewRequired: true,
        manualReviewReason: 'Sign quantity estimated - verify',
        confidence: 'low',
      }),
    );
  }

  // Wheel stops
  if (accessories.wheelStopQty > 0) {
    const price = ACCESSORY_PRICES.find((a) => a.id === 'acc-wheelstop');
    items.push(
      line({
        category: 'MATERIAL',
        description: 'Wheel Stop (installed)',
        quantity: accessories.wheelStopQty,
        unit: 'each',
        unitPrice: price?.midPrice ?? 112,
        pricingSource: 'industry_standard',
        ruleName: 'acc-wheelstops',
        ruleReason: `${accessories.wheelStopQty} wheel stops.`,
        sourceInputs: ['accessories.wheelStopQty'],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
  }

  // Striping
  if (accessories.stripingRequired) {
    const price = ACCESSORY_PRICES.find((a) => a.id === 'acc-striping');
    items.push(
      line({
        category: 'SITE_WORK',
        description: 'Parking Space Striping (EV designated)',
        quantity: charger.count,
        unit: 'spaces',
        unitPrice: price?.midPrice ?? 350,
        pricingSource: 'industry_standard',
        ruleName: 'acc-striping',
        ruleReason: `Striping for ${charger.count} EV charging spaces.`,
        sourceInputs: ['accessories.stripingRequired', 'charger.count'],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
  }

  return { items, reviews };
}

// ── 8. Service Fee Rules ─────────────────────────────────────

function serviceFeeRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];

  // Only for Supercharger projects with connectivity
  if (
    input.project.projectType === 'full_turnkey_connectivity' ||
    input.project.projectType === 'supercharger'
  ) {
    reviews.push(
      review({
        field: 'project.projectType',
        condition: 'Supercharger project - recurring fees apply',
        severity: 'info',
        message:
          'Tesla Supercharger recurring service fees apply: Public $0.10/kWh, Semi $0.08/kWh, Private $0.06/kWh or $6,000/stall/year. These are ongoing costs, not included in one-time estimate total.',
      }),
    );
    items.push(
      line({
        category: 'SERVICE_FEE',
        description:
          'Tesla Recurring Service Fee (informational - not in total)',
        quantity: 1,
        unit: 'note',
        unitPrice: 0,
        pricingSource: 'catalog_bulk',
        ruleName: 'service-tesla-recurring',
        ruleReason:
          'Tesla charges ongoing service fees for Supercharger connectivity. Rate depends on public/private/semi designation. This is a recurring cost shown for reference.',
        sourceInputs: ['project.projectType'],
        manualReviewRequired: false,
        confidence: 'high',
      }),
    );
  }

  return { items, reviews };
}

// ── 9. Remove & Replace Rules ────────────────────────────────

function removeReplaceRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];

  if (
    input.project.projectType !== 'remove_replace' ||
    !input.removeReplace
  ) {
    return { items, reviews };
  }

  const rr = input.removeReplace;
  const count = rr.existingChargerCount ?? 0;

  if (count > 0) {
    items.push(
      line({
        category: 'SITE_WORK',
        description: `Remove Existing Chargers (${rr.existingBrand ?? 'unknown brand'})`,
        quantity: count,
        unit: 'each',
        unitPrice: 500,
        pricingSource: 'industry_standard',
        ruleName: 'rr-remove-existing',
        ruleReason: `Removal of ${count} existing ${rr.existingBrand ?? 'unknown'} chargers. Includes disconnection, unmounting, and disposal.`,
        sourceInputs: [
          'removeReplace.existingChargerCount',
          'removeReplace.existingBrand',
        ],
        manualReviewRequired: true,
        manualReviewReason:
          'Removal scope depends on existing mount type and wiring',
        confidence: 'low',
      }),
    );
  }

  return { items, reviews };
}

// ── 10. Charger Installation Labor ───────────────────────────

function installLaborRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];
  const { charger, chargerInstall } = input;

  if (chargerInstall.responsibility === 'client') {
    reviews.push(
      review({
        field: 'chargerInstall.responsibility',
        condition: 'Client-responsible install',
        severity: 'info',
        message:
          'Charger installation is client responsibility. Install labor excluded.',
      }),
    );
    return { items, reviews };
  }

  // Supercharger installs are typically included in the package
  const isSupercharger =
    charger.brand.toLowerCase().includes('tesla') &&
    charger.model.toLowerCase().includes('supercharger');

  if (!isSupercharger) {
    const hoursPerCharger = charger.mountType === 'wall' ? 3 : 5;
    items.push(
      line({
        category: 'ELEC_LBR',
        description: `Charger Installation Labor (${charger.mountType ?? 'standard'} mount)`,
        quantity: charger.count * hoursPerCharger,
        unit: 'hours',
        unitPrice: INSTALLATION_COSTS.electricalLabor.mid,
        pricingSource: 'industry_standard',
        ruleName: 'install-charger-labor',
        ruleReason: `${charger.count} chargers x ${hoursPerCharger}hr each (${charger.mountType ?? 'standard'} mount). Includes mounting, wiring, and basic testing.`,
        sourceInputs: [
          'charger.count',
          'charger.mountType',
          'chargerInstall.responsibility',
        ],
        manualReviewRequired: false,
        confidence: 'medium',
      }),
    );
  }

  return { items, reviews };
}

// ============================================================
// Master Rule Runner
// ============================================================

export function runAllRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  // Create fresh counters per invocation (safe for concurrent requests)
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
        message:
          'Charger count is 0 or not provided. Estimate cannot be generated without knowing the number of chargers.',
      }),
    );
    return { items: allItems, reviews: allReviews };
  }

  const rulesets = [
    chargerHardwareRules,
    pedestalRules,
    civilRules,
    electricalRules,
    permitDesignRules,
    networkRules,
    accessoryRules,
    serviceFeeRules,
    removeReplaceRules,
    installLaborRules,
  ];

  for (const ruleset of rulesets) {
    const { items, reviews } = ruleset(input);
    allItems.push(...items);
    allReviews.push(...reviews);
  }

  return { items: allItems, reviews: allReviews };
}

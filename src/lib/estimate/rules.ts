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
  SERVICE_FEES,
  PricebookItem,
} from './catalog';
import { getChargePointPrice } from './chargepoint-pricing';

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

function safeNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function line(
  partial: Omit<EstimateLineItem, 'id' | 'extendedPrice'>,
): EstimateLineItem {
  const qty = safeNum(partial.quantity);
  const price = safeNum(partial.unitPrice);
  return {
    ...partial,
    quantity: qty,
    unitPrice: price,
    id: _counters.nextLineId(),
    extendedPrice: Math.round((qty * price + Number.EPSILON) * 100) / 100,
  };
}

function review(
  partial: Omit<ManualReviewTrigger, 'id'>,
): ManualReviewTrigger {
  return { ...partial, id: _counters.nextReviewId() };
}

/**
 * Open trench LF for civil trenching + concrete removal tied to trench (not full conduit run).
 * Prefer explicit civil / map; else cap panel distance by count×15 LF heuristic.
 */
function effectiveTrenchDistanceFt(input: EstimateInput): number {
  const { civil, electrical, charger, mapWorkspace } = input;
  if (typeof civil.trenchDistance_ft === 'number' && civil.trenchDistance_ft >= 0) {
    return civil.trenchDistance_ft;
  }
  if (mapWorkspace?.trenchingDistance_ft != null && mapWorkspace.trenchingDistance_ft > 0) {
    return mapWorkspace.trenchingDistance_ft;
  }
  const panel = electrical.distanceToPanel_ft ?? 50;
  const cap = Math.max(1, charger.count) * 15;
  return Math.min(panel, cap);
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

  const brandLower = (charger.brand ?? '').toLowerCase();
  const modelLower = (charger.model ?? '').toLowerCase();

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
      let cpUnitPrice: number | undefined;
      if (matched.catalogPrice === null) {
        const cpPrice = getChargePointPrice(
          charger.model || modelLower,
          charger.mountType ?? mountKey,
          charger.portType ?? portKey,
        );
        if (cpPrice) {
          cpUnitPrice = cpPrice.total;
        }
      }

      items.push(
        pricebookLine(matched, charger.count, {
          ruleName: 'ChargePoint hardware',
          ruleReason: cpUnitPrice
            ? `${charger.count}x ${matched.description} at $${cpUnitPrice}/ea (from ChargePoint component pricing)`
            : `${charger.count}x ${matched.description}`,
          sourceInputs: ['charger.brand', 'charger.model', 'charger.count', 'charger.mountType', 'charger.portType'],
          unitPrice: cpUnitPrice,
          pricingSource: cpUnitPrice ? 'catalog' : undefined,
          manualReviewRequired: !cpUnitPrice && matched.catalogPrice === null,
          manualReviewReason: !cpUnitPrice && matched.catalogPrice === null
            ? `${matched.description} has no price in the pricebook. Manual pricing required.`
            : undefined,
          confidence: cpUnitPrice ? 'high' : matched.catalogPrice !== null ? 'high' : 'low',
        }),
      );
      if (!cpUnitPrice && matched.catalogPrice === null) {
        reviews.push(
          review({
            field: 'charger.model',
            condition: 'No catalog price',
            severity: 'warning',
            message: `${matched.description} has no catalog or component price. Manual pricing required.`,
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

  // Tesla Superchargers ship with integrated posts — no separate pedestal
  // line. Skip this rule for supercharger / DCFC jobs.
  const isSupercharger =
    input.project.projectType === 'supercharger' ||
    charger.chargingLevel === 'l3_dcfc' ||
    (charger.model ?? '').toLowerCase().includes('supercharger');
  if (isSupercharger) {
    return { items, reviews };
  }

  const pedCount = charger.pedestalCount > 0 ? charger.pedestalCount : charger.count;
  const pedItem = findPricebookItem('pedestal-tesla-wc');

  if (pedItem && (input.charger.brand ?? '').toLowerCase().includes('tesla')) {
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

  const isSupercharger =
    (charger.brand ?? '').toLowerCase().includes('tesla') &&
    ((charger.model ?? '').toLowerCase().includes('supercharger') || charger.chargingLevel === 'l3_dcfc');

  if (isSupercharger) {
    if (chargerInstall.responsibility === 'client') {
      reviews.push(
        review({
          field: 'chargerInstall.responsibility',
          condition: 'Client installs chargers',
          severity: 'info',
          message: 'Supercharger installation labor excluded — client responsibility.',
        }),
      );
      return { items, reviews };
    }
    const scInstall = findPricebookItem('eleclbr-install-supercharger');
    if (scInstall && charger.count > 0) {
      items.push(
        pricebookLine(scInstall, charger.count, {
          ruleName: 'Supercharger install & commission',
          ruleReason: `${charger.count}x Supercharger site labor bundle (SG/cabinet/posts/pull/commission) at $${scInstall.catalogPrice}/ea`,
          sourceInputs: ['charger.brand', 'charger.model', 'charger.count', 'charger.chargingLevel'],
          manualReviewRequired: true,
          manualReviewReason: 'Verify bundle matches utility and Tesla scope (posts vs full package)',
          confidence: 'medium',
        }),
      );
    }

    // Supercharger construction allowance — per-stall bundled civil cost
    // (post foundations, conduit encasement, 500 MCM feeder, trenching).
    // Site-specific variances are averaged; override when a site walk
    // produces concrete, trench-LF, or encasement numbers.
    // Target: lands total construction at ~$30k / port matching Bullet EV's
    // typical Tesla Supercharger quoting basis.
    if (charger.count > 0) {
      const ALLOWANCE_PER_STALL = 6250;
      items.push(
        line({
          category: 'CIVIL',
          description: 'Supercharger Construction Allowance (Per-Stall Civil Bundle)',
          quantity: charger.count,
          unit: 'EA',
          unitPrice: ALLOWANCE_PER_STALL,
          pricingSource: 'allowance',
          ruleName: 'Supercharger construction allowance',
          ruleReason: `Bundled site-typical construction per stall (post foundations, conduit encasement, 500 MCM feeder, trenching). ${charger.count} stalls × $${ALLOWANCE_PER_STALL}/ea. Override if actual site quantities differ.`,
          sourceInputs: ['project.projectType', 'charger.count'],
          manualReviewRequired: true,
          manualReviewReason: 'Allowance — confirm site-specific civil scope at walk',
          confidence: 'medium',
        }),
      );
    }
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

  const isDual = charger.portType === 'dual';
  const isXeal = (charger.brand ?? '').toLowerCase().includes('xeal');

  let installItemId: string;

  if (charger.mountType === null || charger.mountType === 'other') {
    installItemId = isDual ? 'eleclbr-install-wall-dual' : 'eleclbr-install-wall-single';
    reviews.push(
      review({
        field: 'charger.mountType',
        condition: 'Mount type unknown',
        severity: 'warning',
        message: `Mount type ${charger.mountType === 'other' ? '"other"' : 'not specified'} — defaulting to wall-mounted install labor. Verify before finalizing.`,
      }),
    );
  } else {
    const isWall = charger.mountType === 'wall';
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
  }

  const installItem = findPricebookItem(installItemId);
  if (installItem) {
    const installQty = isDual
      ? (charger.pedestalCount > 0 ? charger.pedestalCount : Math.ceil(charger.count / 2))
      : charger.count;
    const complexUtilitySinglePed =
      installItemId === 'eleclbr-install-ped-single' &&
      input.electrical.utilityCoordinationRequired === true;
    const installUnit = complexUtilitySinglePed ? 975 : undefined;
    items.push(
      pricebookLine(installItem, installQty, {
        ruleName: 'Charger install labor',
        ruleReason: `${installQty}x ${installItem.description} at $${installUnit ?? installItem.catalogPrice}/ea${complexUtilitySinglePed ? ' (utility coordination complexity)' : ''}`,
        sourceInputs: complexUtilitySinglePed
          ? [
              'charger.count',
              'charger.pedestalCount',
              'charger.mountType',
              'charger.portType',
              'charger.brand',
              'electrical.utilityCoordinationRequired',
            ]
          : [
              'charger.count',
              'charger.pedestalCount',
              'charger.mountType',
              'charger.portType',
              'charger.brand',
            ],
        unitPrice: installUnit,
        pricingSource: complexUtilitySinglePed ? 'catalog_override' : undefined,
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

  // ── Switchgear & meter infrastructure (explicit SOW flags) ──
  if (electrical.switchgearRequired === true) {
    const sg = findPricebookItem('elec-switchgear');
    if (sg) {
      items.push(
        pricebookLine(sg, 1, {
          ruleName: 'Switchgear',
          ruleReason: 'Switchgear / EV Lite switchgear included per scope',
          sourceInputs: ['electrical.switchgearRequired'],
          manualReviewRequired: true,
          confidence: 'medium',
        }),
      );
    }
  }
  if (electrical.meterRoomRequired === true) {
    const mp = findPricebookItem('elec-meter-pad');
    if (mp) {
      items.push(
        pricebookLine(mp, 1, {
          ruleName: 'Meter pad / housing',
          ruleReason: 'Meter pad, housing, or service entrance scope per SOW',
          sourceInputs: ['electrical.meterRoomRequired'],
          manualReviewRequired: true,
          confidence: 'medium',
        }),
      );
    }
  }

  const pvc4 = electrical.pvcConduit4in_ft;
  const pvc3 = electrical.pvcConduit3in_ft;
  const pvc1 = electrical.pvcConduit1in_ft;
  const wireFt = electrical.wire500mcm_ft;
  const hasFeederBreakdown =
    (pvc4 != null && pvc4 > 0) ||
    (pvc3 != null && pvc3 > 0) ||
    (pvc1 != null && pvc1 > 0) ||
    (wireFt != null && wireFt > 0);

  if (hasFeederBreakdown) {
    const addLf = (id: string, qty: number | null | undefined, label: string) => {
      if (qty == null || qty <= 0) return;
      const pb = findPricebookItem(id);
      if (pb) {
        items.push(
          pricebookLine(pb, qty, {
            ruleName: label,
            ruleReason: `${qty} LF — ${pb.description}`,
            sourceInputs: ['electrical feeder breakdown'],
            confidence: 'high',
          }),
        );
      }
    };
    addLf('eleclbrmat-pvc-4in', pvc4, 'PVC 4" conduit');
    addLf('eleclbrmat-pvc-3in', pvc3, 'PVC 3" conduit');
    addLf('eleclbrmat-pvc-1in', pvc1, 'PVC 1" conduit');
    if (wireFt != null && wireFt > 0) {
      const w = findPricebookItem('eleclbrmat-wire-500mcm');
      if (w) {
        items.push(
          pricebookLine(w, wireFt, {
            ruleName: 'Large feeder wire',
            ruleReason: `${wireFt} LF large conductor run`,
            sourceInputs: ['electrical.wire500mcm_ft'],
            manualReviewRequired: true,
            manualReviewReason: 'Verify conductor size and terminations vs engineering',
            confidence: 'medium',
          }),
        );
      }
    }
  } else {
    // ── Conduit / conductors (ELEC LBR MAT) — split lines for L2 when distance known; else composite ──
    const distance = input.mapWorkspace?.conduitDistance_ft ?? electrical.distanceToPanel_ft ?? 50;
    const distanceKnown =
      input.mapWorkspace?.conduitDistance_ft != null || electrical.distanceToPanel_ft !== null;

    const isSuperchargerElectrical =
      input.project.projectType === 'supercharger' || charger.chargingLevel === 'l3_dcfc';

    const useConduitOverride =
      distance > 100 || input.parkingEnvironment.fireRatedPenetrations === true;

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

    if (!isSuperchargerElectrical && distanceKnown) {
      const isSinglePort = charger.portType === 'single';
      const longRun = distance > 60;

      if (isSinglePort) {
        const emt125 = findPricebookItem('eleclbrmat-emt-125');
        if (emt125) {
          items.push(
            pricebookLine(emt125, distance, {
              ruleName: 'EMT 1-1/4" conduit',
              ruleReason: `${distance} LF EMT 1-1/4" at $${emt125.catalogPrice}/ft (single-port run)`,
              sourceInputs: ['electrical.distanceToPanel_ft', 'charger.portType'],
              confidence: 'high',
            }),
          );
        }
      } else if (longRun) {
        const cond = findPricebookItem('eleclbrmat-conductors');
        const pvc3 = findPricebookItem('eleclbrmat-pvc-3in');
        if (cond) {
          items.push(
            pricebookLine(cond, distance, {
              ruleName: 'Conductors (≤#4)',
              ruleReason: `${distance} LF conductor installation at $${cond.catalogPrice}/ft`,
              sourceInputs: ['electrical.distanceToPanel_ft', 'charger.portType'],
              confidence: 'high',
            }),
          );
        }
        if (pvc3) {
          items.push(
            pricebookLine(pvc3, distance, {
              ruleName: 'PVC 3" conduit',
              ruleReason: `${distance} LF PVC 3" Schedule 40 at $${pvc3.catalogPrice}/ft`,
              sourceInputs: ['electrical.distanceToPanel_ft', 'charger.portType'],
              confidence: 'high',
            }),
          );
        }
      } else {
        const conduitItem = findPricebookItem('eleclbrmat-conduit-wire');
        const pvc = findPricebookItem('eleclbrmat-pvc-conduit');
        if (conduitItem) {
          const resolved = resolvePrice(conduitItem, useConduitOverride);
          items.push(
            pricebookLine(conduitItem, distance, {
              ruleName: 'EMT conduit / wire / breakers',
              ruleReason: `${distance} LF EMT conduit, wire, breakers at $${resolved.price}/ft`,
              sourceInputs: [
                input.mapWorkspace?.conduitDistance_ft != null
                  ? 'mapWorkspace.conduitDistance_ft'
                  : 'electrical.distanceToPanel_ft',
                'charger.count',
              ],
              unitPrice: resolved.price ?? conduitItem.catalogPrice ?? 0,
              pricingSource:
                resolved.source === 'override' ? 'catalog_override' : 'catalog',
              manualReviewRequired: false,
              confidence: 'high',
            }),
          );
        }
        if (pvc) {
          items.push(
            pricebookLine(pvc, distance, {
              ruleName: 'PVC conduit (≤2")',
              ruleReason: `${distance} LF PVC Schedule 40 with #4 conductors at $${pvc.catalogPrice}/ft`,
              sourceInputs: ['electrical.distanceToPanel_ft'],
              confidence: 'high',
            }),
          );
        }
      }
    } else {
      const conduitItem = findPricebookItem('eleclbrmat-conduit-wire');
      if (conduitItem) {
        const resolved = resolvePrice(conduitItem, useConduitOverride);
        items.push(
          pricebookLine(conduitItem, distance, {
            ruleName: 'Conduit/wire/breakers',
            ruleReason: `${distance} LF of EMT conduit, wire, breakers at $${resolved.price}/ft. ${input.mapWorkspace?.conduitDistance_ft != null ? 'Distance from map measurement.' : distanceKnown ? 'Distance from SOW.' : 'Distance estimated at 50ft — verify at site walk.'}`,
            sourceInputs: [
              input.mapWorkspace?.conduitDistance_ft != null
                ? 'mapWorkspace.conduitDistance_ft'
                : 'electrical.distanceToPanel_ft',
              'charger.count',
            ],
            unitPrice: resolved.price ?? conduitItem.catalogPrice ?? 0,
            pricingSource:
              resolved.source === 'override' ? 'catalog_override' : 'catalog',
            manualReviewRequired: !distanceKnown,
            manualReviewReason: !distanceKnown
              ? 'Electrical distance not specified — using 50ft estimate'
              : undefined,
            confidence: distanceKnown ? 'high' : 'medium',
          }),
        );
      }
    }
  }

  // ── Sub-panel (only when explicitly required) ──
  // Prior heuristic "count >= 4" auto-charged $1,050 on jobs that didn't
  // need a sub-panel (e.g. Hampton Inn — 4 chargers, panelUpgradeRequired:
  // false, proposal had no sub-panel line). Emit a review instead.
  if (electrical.panelUpgradeRequired === true) {
    const subpanelItem = findPricebookItem('eleclbrmat-subpanel');
    if (subpanelItem) {
      items.push(
        pricebookLine(subpanelItem, 1, {
          ruleName: 'EV sub-panel',
          ruleReason: 'Panel upgrade flagged in SOW',
          sourceInputs: ['electrical.panelUpgradeRequired'],
          confidence: 'high',
        }),
      );
    }
  } else if (charger.count >= 4 && electrical.panelUpgradeRequired !== false) {
    reviews.push(
      review({
        field: 'electrical.panelUpgradeRequired',
        condition: `${charger.count} chargers with panelUpgradeRequired unknown`,
        severity: 'warning',
        message: `${charger.count} chargers often need a dedicated sub-panel. Confirm with electrician; set electrical.panelUpgradeRequired if one is required so the line item gets priced.`,
      }),
    );
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
  const { parkingEnvironment, electrical, charger, civil } = input;
  const baseDistance = electrical.distanceToPanel_ft ?? 50;
  const distance = baseDistance; // used for coring qty estimation
  const trenchDistOpen = effectiveTrenchDistanceFt(input);
  const pedestalBasisForConcrete =
    charger.pedestalCount > 0
      ? charger.pedestalCount
      : charger.portType === 'dual'
        ? Math.ceil(charger.count / 2)
        : charger.count;

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
      const trenchDist =
        input.mapWorkspace?.trenchingDistance_ft != null &&
        input.mapWorkspace.trenchingDistance_ft > 0
          ? input.mapWorkspace.trenchingDistance_ft
          : trenchDistOpen;
      if (trenchItem && trenchDist > 0) {
        items.push(
          pricebookLine(trenchItem, trenchDist, {
            ruleName: 'Surface trenching',
            ruleReason: `${trenchDist} LF trenching in soft/normal soil at $${trenchItem.catalogPrice}/ft`,
            sourceInputs: [
              'parkingEnvironment.type',
              'parkingEnvironment.trenchingRequired',
              'electrical.distanceToPanel_ft',
              'civil.trenchDistance_ft',
            ],
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

    // Concrete pads (for pedestal mount on surface/mixed, or padRequired)
    if (
      (charger.mountType === 'pedestal' || input.accessories.padRequired) &&
      (parkingEnvironment.type === 'surface_lot' || parkingEnvironment.type === 'mixed')
    ) {
      const padItem = findPricebookItem('civil-concrete-pad');
      if (padItem) {
        const padCount = charger.pedestalCount > 0 ? charger.pedestalCount : charger.count;
        if (padCount > 0) {
          items.push(
            pricebookLine(padItem, padCount, {
              ruleName: 'Concrete pads for pedestals',
              ruleReason: `${padCount}x concrete pads at $${padItem.catalogPrice}/ea`,
              sourceInputs: ['charger.mountType', 'charger.pedestalCount', 'parkingEnvironment.type', 'accessories.padRequired'],
              confidence: 'medium',
            }),
          );
        }
      }
    }
  }

  // ── Concrete Removal & Restoration (when trenching through concrete areas) ──
  if (parkingEnvironment.surfaceType === 'concrete' && parkingEnvironment.trenchingRequired !== false) {
    const trenchDistForConcrete =
      input.mapWorkspace?.trenchingDistance_ft != null &&
      input.mapWorkspace.trenchingDistance_ft > 0
        ? input.mapWorkspace.trenchingDistance_ft
        : trenchDistOpen;
    const removalQty = Math.max(
      1,
      Math.ceil(trenchDistForConcrete / 15),
      pedestalBasisForConcrete,
    );
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
      const coreBasis =
        charger.pedestalCount > 0 ? charger.pedestalCount : charger.count;
      const coreQty = Math.max(1, Math.ceil(coreBasis / 2));
      items.push(pricebookLine(coreDrillItem, coreQty, {
        ruleName: 'Core drilling',
        ruleReason: `${coreQty}x core drilling 1"-6" at $${coreDrillItem.catalogPrice}/ea for conduit penetrations`,
        sourceInputs: [
          'parkingEnvironment.coringRequired',
          'charger.count',
          'charger.pedestalCount',
        ],
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

  // ── Explicit civil quantities (tabular SOW / manual entry) ──
  if (civil.asphaltRemoval_sf != null && civil.asphaltRemoval_sf > 0) {
    const ar = findPricebookItem('civil-asphalt-removal');
    if (ar) {
      items.push(
        pricebookLine(ar, civil.asphaltRemoval_sf, {
          ruleName: 'Asphalt removal',
          ruleReason: `${civil.asphaltRemoval_sf} SF asphalt removal per SOW`,
          sourceInputs: ['civil.asphaltRemoval_sf'],
          confidence: 'high',
        }),
      );
    }
  }
  if (civil.asphaltRestore_sf != null && civil.asphaltRestore_sf > 0) {
    const ars = findPricebookItem('civil-asphalt-restore');
    if (ars) {
      items.push(
        pricebookLine(ars, civil.asphaltRestore_sf, {
          ruleName: 'Asphalt restoration',
          ruleReason: `${civil.asphaltRestore_sf} SF asphalt restoration per SOW`,
          sourceInputs: ['civil.asphaltRestore_sf'],
          confidence: 'high',
        }),
      );
    }
  }
  if (civil.encasement_CY != null && civil.encasement_CY > 0) {
    const enc = findPricebookItem('civil-encasement');
    if (enc) {
      items.push(
        pricebookLine(enc, civil.encasement_CY, {
          ruleName: 'Conduit encasement',
          ruleReason: `${civil.encasement_CY} CY encasement of conduits / compaction per SOW`,
          sourceInputs: ['civil.encasement_CY'],
          confidence: 'high',
        }),
      );
    }
  }
  if (civil.postFoundation_CY != null && civil.postFoundation_CY > 0) {
    const pf = findPricebookItem('civil-post-foundation-monolithic');
    if (pf) {
      items.push(
        pricebookLine(pf, civil.postFoundation_CY, {
          ruleName: 'Post foundations',
          ruleReason: `${civil.postFoundation_CY} CY post pad / monolithic concrete per SOW`,
          sourceInputs: ['civil.postFoundation_CY'],
          confidence: 'high',
        }),
      );
    }
  }
  if (civil.cabinetPad_CY != null && civil.cabinetPad_CY > 0) {
    const cp = findPricebookItem('civil-cabinet-pad');
    if (cp) {
      items.push(
        pricebookLine(cp, civil.cabinetPad_CY, {
          ruleName: 'Cabinet / switchgear pads',
          ruleReason: `${civil.cabinetPad_CY} CY equipment pad for cabinets per SOW`,
          sourceInputs: ['civil.cabinetPad_CY'],
          confidence: 'high',
        }),
      );
    }
  }
  if (civil.groundPrepCabinet === true) {
    const gp = findPricebookItem('civil-ground-prep-cabinet');
    if (gp) {
      items.push(
        pricebookLine(gp, 1, {
          ruleName: 'Ground prep — cabinet',
          ruleReason: 'Civil ground prep for cabinet / switchgear pad per SOW',
          sourceInputs: ['civil.groundPrepCabinet'],
          confidence: 'high',
        }),
      );
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

// ── 5b. Construction support (Supercharger / large sites) ────────

function constructionSupportRules(
  input: EstimateInput,
): { items: EstimateLineItem[]; reviews: ManualReviewTrigger[] } {
  const items: EstimateLineItem[] = [];
  const reviews: ManualReviewTrigger[] = [];

  const isSupercharger =
    input.project.projectType === 'supercharger' ||
    ((input.charger.brand ?? '').toLowerCase().includes('tesla') &&
      ((input.charger.model ?? '').toLowerCase().includes('supercharger') ||
        input.charger.chargingLevel === 'l3_dcfc'));

  if (isSupercharger && input.charger.count >= 4) {
    const bundle = findPricebookItem('misc-construction-support');
    if (bundle) {
      items.push(
        pricebookLine(bundle, 1, {
          ruleName: 'Construction support bundle',
          ruleReason: 'Fence / roll-off / sanitation typical for multi-stall Supercharger sites',
          sourceInputs: ['project.projectType', 'charger.count'],
          manualReviewRequired: true,
          confidence: 'medium',
        }),
      );
    }
    const rental = findPricebookItem('misc-equipment-rental');
    if (rental) {
      items.push(
        pricebookLine(rental, 2, {
          ruleName: 'Equipment rental',
          ruleReason: 'Equipment rental periods — verify duration with GC',
          sourceInputs: ['project.projectType', 'charger.count'],
          manualReviewRequired: true,
          confidence: 'medium',
        }),
      );
    }
  }

  // Equipment rental for non-Supercharger projects with civil work
  const panelFt = input.electrical.distanceToPanel_ft ?? 0;
  const longSurfaceTrench =
    !isSupercharger &&
    input.parkingEnvironment.type === 'surface_lot' &&
    input.parkingEnvironment.trenchingRequired === true &&
    panelFt >= 95;

  if (
    !isSupercharger &&
    (input.parkingEnvironment.trenchingRequired === true ||
      input.parkingEnvironment.boringRequired === true ||
      input.parkingEnvironment.coringRequired === true)
  ) {
    const rental = findPricebookItem('misc-equipment-rental');
    if (rental) {
      const pricedRental = longSurfaceTrench;
      items.push(
        pricebookLine(rental, 1, {
          ruleName: 'Equipment rental',
          ruleReason: pricedRental
            ? `Equipment rental for extended surface trench / civil work at $1500 (verify duration)`
            : 'Equipment rental for civil / electrical work',
          sourceInputs: ['parkingEnvironment.trenchingRequired', 'electrical.distanceToPanel_ft'],
          manualReviewRequired: true,
          manualReviewReason: 'Verify rental duration and equipment type',
          confidence: pricedRental ? 'medium' : 'low',
          unitPrice: pricedRental ? 1500 : 0,
          pricingSource: pricedRental ? 'industry_standard' : 'tbd',
        }),
      );
    }
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

    // Utility coordination — only when explicitly required.
    // Gating on designEngineering.responsibility alone caused Hampton Inn
    // to auto-charge $950 even though utilityCoordinationRequired was false.
    if (input.electrical.utilityCoordinationRequired === true) {
      const utilCoordItem = findPricebookItem('deseng-utility-coord');
      if (utilCoordItem) {
        items.push(
          pricebookLine(utilCoordItem, 1, {
            ruleName: 'Utility coordination',
            ruleReason: `Up to 2 in-person visits at $${utilCoordItem.catalogPrice}`,
            sourceInputs: ['designEngineering.responsibility', 'electrical.utilityCoordinationRequired'],
          }),
        );
      }
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

  // WiFi install labor when Bullet is responsible, even on customer LAN
  if (
    network.wifiInstallResponsibility === 'bullet' &&
    (network.type === 'customer_lan' || network.type === 'wifi_bridge')
  ) {
    const wifiInstall = findPricebookItem('network-wifi-install');
    if (wifiInstall) {
      items.push(
        pricebookLine(wifiInstall, 1, {
          ruleName: 'WiFi equipment install',
          ruleReason: `Install owner-provided WiFi equipment at $${wifiInstall.catalogPrice}`,
          sourceInputs: ['network.wifiInstallResponsibility', 'network.type'],
        }),
      );
    }
  }

  if (network.type === 'none' || network.type === 'customer_lan' || network.type === 'included_in_package') {
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

  // ── Wheel Stops (rubber) ──
  if (accessories.wheelStopQty > 0) {
    const wsItem = findPricebookItem('site-rubber-wheelstop');
    if (wsItem) {
      items.push(
        pricebookLine(wsItem, accessories.wheelStopQty, {
          ruleName: 'Rubber wheel stops',
          ruleReason: `${accessories.wheelStopQty}x rubber wheel stops at $${wsItem.catalogPrice}/ea`,
          sourceInputs: ['accessories.wheelStopQty'],
        }),
      );
    }
  }

  // ── Striping ──
  if (accessories.stripingRequired) {
    const stripingItem = findPricebookItem('site-striping');
    if (stripingItem) {
      const stripingQty = charger.count > 0 ? charger.count : 1;
      items.push(
        pricebookLine(stripingItem, stripingQty, {
          ruleName: 'Parking striping',
          ruleReason: `${stripingQty}x stall striping at $${stripingItem.catalogPrice}/ea`,
          sourceInputs: ['accessories.stripingRequired', 'charger.count'],
        }),
      );
    }
  }

  // ── Misc Mounting Hardware ──
  const hardwareQty =
    charger.pedestalCount > 0 && charger.pedestalCount < charger.count
      ? charger.pedestalCount
      : charger.count;
  const hardwareItem = findPricebookItem('material-mounting-hardware');
  if (hardwareItem && hardwareQty > 0) {
    items.push(
      pricebookLine(hardwareItem, hardwareQty, {
        ruleName: 'Mounting hardware',
        ruleReason: `${hardwareQty}x misc mounting hardware & BOS at $${hardwareItem.catalogPrice}/ea`,
        sourceInputs: ['charger.count', 'charger.pedestalCount'],
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
  if (!(charger.brand ?? '').toLowerCase().includes('chargepoint')) {
    return { items, reviews };
  }

  if ((charger.model ?? '').toLowerCase().includes('cpf50') || (charger.model ?? '').toLowerCase().includes('cpf')) {
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
    (input.charger.brand ?? '').toLowerCase().includes('tesla') &&
    ((input.charger.model ?? '').toLowerCase().includes('supercharger') ||
      input.charger.chargingLevel === 'l3_dcfc' ||
      input.project.projectType === 'supercharger');

  if (!isSupercharger) return { items, reviews };

  const fee = SERVICE_FEES.find((f) => f.id === 'svc-public-ppu') ?? SERVICE_FEES[0];
  if (!fee) return { items, reviews };
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

  // Large deployment sanity gate
  if (input.charger.count > 20) {
    allReviews.push(
      review({
        field: 'charger.count',
        condition: 'Large deployment',
        severity: 'warning',
        message: `${input.charger.count} chargers is a large deployment. Civil, accessory, and labor quantities should be manually verified.`,
      }),
    );
  }

  const rulesets = [
    chargerHardwareRules,
    pedestalRules,
    installLaborRules,
    electricalRules,
    civilRules,
    constructionSupportRules,
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

import type {
  EstimateInput,
  EstimateLineItem,
  EstimateOutput,
  ManualReviewTrigger,
  PriceValidationIssue,
} from './types';
import { runAllRules } from './rules';
import { mapWorkspaceRules } from './map-rules';
import { selectExclusions } from './exclusions';
import { buildLineItemsFromSowImport, sowImportInfoReview } from './sow-import';
import { validateAndCalibratePrices } from './price-validation';

// ============================================================
// Input Completeness Scoring
// ============================================================

function scoreInputCompleteness(input: EstimateInput): number {
  let filled = 0;
  let total = 0;

  const check = (value: unknown, weight: number = 1): void => {
    total += weight;
    if (value !== null && value !== undefined && value !== '' && value !== 'unknown' && value !== 0) {
      filled += weight;
    }
  };

  // Project (weight 1 each)
  check(input.project.name);
  check(input.project.projectType);
  check(input.project.timeline);
  check(input.project.isNewConstruction);

  // Customer
  check(input.customer.companyName);
  check(input.customer.contactName);
  check(input.customer.contactEmail);

  // Site
  check(input.site.address);
  check(input.site.siteType);
  check(input.site.state);

  // Parking environment (higher weight - critical for pricing)
  check(input.parkingEnvironment.type, 2);
  check(input.parkingEnvironment.surfaceType);
  check(input.parkingEnvironment.indoorOutdoor);

  // Charger (highest weight)
  check(input.charger.brand, 2);
  check(input.charger.model, 2);
  check(input.charger.count, 2);
  check(input.charger.mountType);
  check(input.charger.chargingLevel, 2);

  // Electrical (high weight)
  check(input.electrical.serviceType, 2);
  check(input.electrical.availableCapacityKnown, 2);
  check(input.electrical.distanceToPanel_ft, 2);
  check(input.electrical.breakerSpaceAvailable);
  check(input.electrical.panelUpgradeRequired);
  check(input.electrical.transformerRequired);

  // Permit/design
  check(input.permit.responsibility);
  check(input.designEngineering.responsibility);

  // Network
  check(input.network.type);

  // Responsibilities
  check(input.makeReady.responsibility);
  check(input.chargerInstall.responsibility);
  check(input.purchasingChargers.responsibility);

  // Garage-specific fields (only count if garage)
  if (
    input.parkingEnvironment.type === 'parking_garage' ||
    input.parkingEnvironment.type === 'mixed'
  ) {
    check(input.parkingEnvironment.hasPTSlab, 2);
    check(input.parkingEnvironment.coringRequired);
    check(input.parkingEnvironment.fireRatedPenetrations);
  }

  return total === 0 ? 0 : Math.round((filled / total) * 100);
}

// ============================================================
// Automation Confidence
// ============================================================

function determineConfidence(
  completeness: number,
  manualReviewCount: number,
): 'high' | 'medium' | 'low' {
  if (completeness >= 80 && manualReviewCount <= 2) return 'high';
  if (completeness >= 50 && manualReviewCount <= 5) return 'medium';
  return 'low';
}

// ============================================================
// Main Engine
// ============================================================

function safeNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function generateEstimate(input: EstimateInput): EstimateOutput {
  if (!input || typeof input !== 'object') {
    throw new Error('generateEstimate: invalid input');
  }

  const useSowImport =
    Array.isArray(input.rawLineItems) && input.rawLineItems.length > 0;

  let items: EstimateLineItem[];
  let reviews: ManualReviewTrigger[];
  let priceValidation: PriceValidationIssue[] = [];

  if (useSowImport) {
    items = buildLineItemsFromSowImport(input.rawLineItems!);
    reviews = [sowImportInfoReview()];
  } else {
    const rulesResult = runAllRules(input);
    items = rulesResult.items;
    reviews = rulesResult.reviews;

    if (input.charger?.count > 0) {
      const mapResult = mapWorkspaceRules(input);
      items.push(...mapResult.items);
      reviews.push(...mapResult.reviews);
    }

    // Observed-range validation + median calibration when outside real proposal stats (pricebook-v2)
    const calibrated = validateAndCalibratePrices(items, {
      // D1: always record out-of-range flags. D2 median swap is opt-in — it can skew totals vs. catalog rules.
      applyMedianWhenOutOfRange: false,
    });
    items = calibrated.items;
    priceValidation = calibrated.issues;
  }

  // 2. Select exclusions
  const exclusions = selectExclusions(input);

  // 3. Calculate summaries
  const hardwareCategories = new Set(['CHARGER', 'PEDESTAL']);
  const installCategories = new Set([
    'CIVIL',
    'ELEC',
    'ELEC LBR',
    'ELEC LBR MAT',
    'ELEC MAT',
    'SITE WORK',
    'SAFETY',
  ]);
  const permitDesignCategories = new Set(['PERMIT', 'DES/ENG']);
  const networkCategories = new Set(['NETWORK']);
  const accessoryCategories = new Set(['MATERIAL', 'MISC']);
  const serviceCategories = new Set(['SERVICE_FEE', 'SOFTWARE']);

  const sumByGroup = (cats: Set<string>): number =>
    items
      .filter((li) => cats.has(li.category))
      .reduce((sum, li) => sum + li.extendedPrice, 0);

  const hardwareTotal = sumByGroup(hardwareCategories);
  const installationTotal = sumByGroup(installCategories);
  const permitDesignTotal = sumByGroup(permitDesignCategories);
  const networkTotal = sumByGroup(networkCategories);
  const accessoriesTotal = sumByGroup(accessoryCategories);
  const serviceTotal = sumByGroup(serviceCategories);

  const subtotal =
    hardwareTotal +
    installationTotal +
    permitDesignTotal +
    networkTotal +
    accessoriesTotal +
    serviceTotal;

  // Apply markup (NaN-safe — defensive against malformed estimateControls)
  const markupPct = safeNum(input.estimateControls?.markupPercent);
  const taxPct = safeNum(input.estimateControls?.taxRate);
  const contingencyPct = safeNum(input.estimateControls?.contingencyPercent);

  const markedUpSubtotal = subtotal * (1 + markupPct / 100);
  const tax = markedUpSubtotal * (taxPct / 100);
  const contingency = markedUpSubtotal * (contingencyPct / 100);
  const total = markedUpSubtotal + tax + contingency;

  // Warn about zero-priced items that should have real pricing
  const zeroPriceItems = items.filter(
    (li) => li.unitPrice === 0 && li.pricingSource !== 'catalog' && li.quantity > 0,
  );
  if (zeroPriceItems.length > 0) {
    reviews.push({
      id: `MR-ZERO-PRICE`,
      field: 'lineItems',
      condition: 'Items with $0 pricing',
      severity: 'warning',
      message: `${zeroPriceItems.length} line item(s) have $0 pricing and are not included in the total: ${zeroPriceItems.map((li) => li.description).join(', ')}`,
    });
  }

  // 4. Metadata
  const completeness = scoreInputCompleteness(input);
  const criticalReviews = reviews.filter((r) => r.severity === 'critical');
  const confidence = determineConfidence(completeness, criticalReviews.length);

  return {
    input,
    lineItems: items,
    exclusions,
    manualReviewTriggers: reviews,
    summary: {
      subtotal: Math.round(markedUpSubtotal * 100) / 100,
      lineItemTotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      contingency: Math.round(contingency * 100) / 100,
      total: Math.round(total * 100) / 100,
      hardwareTotal: Math.round(hardwareTotal * 100) / 100,
      installationTotal: Math.round(installationTotal * 100) / 100,
      permitDesignTotal: Math.round(permitDesignTotal * 100) / 100,
      networkTotal: Math.round(networkTotal * 100) / 100,
      accessoriesTotal: Math.round(accessoriesTotal * 100) / 100,
      serviceTotal: Math.round(serviceTotal * 100) / 100,
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      engineVersion: useSowImport ? '0.2.0-sow-import' : '0.1.0-prototype',
      inputCompleteness: completeness,
      automationConfidence: useSowImport ? 'medium' : confidence,
      requiresManualReview:
        useSowImport || reviews.some((r) => r.severity === 'critical' || r.severity === 'warning'),
      ...(priceValidation.length > 0 ? { priceValidation } : {}),
    },
  };
}

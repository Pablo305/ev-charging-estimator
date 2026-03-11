import { EstimateInput, EstimateOutput } from './types';
import { runAllRules } from './rules';
import { selectExclusions } from './exclusions';

// ============================================================
// Input Completeness Scoring
// ============================================================

function scoreInputCompleteness(input: EstimateInput): number {
  let filled = 0;
  let total = 0;

  const check = (value: unknown, weight: number = 1): void => {
    total += weight;
    if (value !== null && value !== undefined && value !== '' && value !== 'unknown') {
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

  return Math.round((filled / total) * 100);
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

export function generateEstimate(input: EstimateInput): EstimateOutput {
  // 1. Run all rules
  const { items, reviews } = runAllRules(input);

  // 2. Select exclusions
  const exclusions = selectExclusions(input);

  // 3. Calculate summaries
  const hardwareCategories = new Set(['CHARGER', 'PEDESTAL']);
  const installCategories = new Set([
    'CIVIL',
    'ELEC_LBR',
    'ELEC_MAT',
    'SITE_WORK',
    'SAFETY',
  ]);
  const permitDesignCategories = new Set(['PERMIT', 'DES/ENG']);
  const networkCategories = new Set(['NETWORK']);
  const accessoryCategories = new Set(['MATERIAL']);
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

  // Apply markup
  const markedUpSubtotal =
    subtotal * (1 + input.estimateControls.markupPercent / 100);

  const tax = markedUpSubtotal * (input.estimateControls.taxRate / 100);
  const contingency =
    markedUpSubtotal * (input.estimateControls.contingencyPercent / 100);
  const total = markedUpSubtotal + tax + contingency;

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
      engineVersion: '0.1.0-prototype',
      inputCompleteness: completeness,
      automationConfidence: confidence,
      requiresManualReview: reviews.some((r) => r.severity === 'critical'),
    },
  };
}

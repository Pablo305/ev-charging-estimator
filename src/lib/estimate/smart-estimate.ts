// ============================================================
// Smart Estimate Engine — "3-click" auto-inference
// ============================================================
// Sales reps place chargers + meter room on the map, everything
// else auto-fills from site intelligence + knowledge base defaults.

import turfDistance from '@turf/distance';
import { point } from '@turf/helpers';
import type { EstimateInput } from './types';
import { emptyInput } from './emptyInput';
import { getSiteRecommendation } from './site-intelligence';
import priceAdjustments from './data/price-adjustments.json';

// ── Interfaces ──

export interface SmartEstimateInput {
  readonly address: string;
  readonly siteCoordinates: [number, number];
  readonly panelLocation: [number, number];
  readonly chargerPlacements: ReadonlyArray<{
    readonly coordinates: [number, number];
    readonly type: 'l2' | 'l3';
  }>;
  readonly siteAssessment?: {
    readonly siteType?: string;
    readonly parkingType?: string;
    readonly surfaceType?: string;
    readonly mountType?: string;
    readonly hasPTSlab?: boolean;
    readonly confidence?: number;
  };
}

export interface HumanReviewItem {
  readonly field: string;
  readonly inferredValue: unknown;
  readonly reason: string;
  readonly source: 'ai' | 'knowledge_base' | 'default';
  readonly variancePct?: number;
}

export interface SmartEstimateResult {
  readonly input: EstimateInput;
  readonly confidence: number;
  readonly humanReviewItems: ReadonlyArray<HumanReviewItem>;
}

// ── Price lookup helpers ──

const HIGH_VARIANCE_THRESHOLD = 10;

function getVariancePct(description: string): number {
  const match = priceAdjustments.adjustments.find(
    (a) => a.description.toLowerCase() === description.toLowerCase(),
  );
  return match?.variancePct ?? 0;
}

function addReviewIfHighVariance(
  items: HumanReviewItem[],
  field: string,
  value: unknown,
  reason: string,
  source: HumanReviewItem['source'],
  pricebookDescription?: string,
): void {
  const variance = pricebookDescription
    ? getVariancePct(pricebookDescription)
    : 0;
  if (variance > HIGH_VARIANCE_THRESHOLD) {
    items.push({ field, inferredValue: value, reason, source, variancePct: variance });
  }
}

// ── Inference functions ──

interface InferenceResult<T> {
  readonly value: T;
  readonly confidence: number;
  readonly source: HumanReviewItem['source'];
}

function inferSiteType(
  smartInput: SmartEstimateInput,
): InferenceResult<EstimateInput['site']['siteType']> {
  const assessment = smartInput.siteAssessment;

  // Use AI assessment if confidence is high enough
  if (assessment?.siteType && (assessment.confidence ?? 0) > 0.6) {
    return {
      value: assessment.siteType as EstimateInput['site']['siteType'],
      confidence: assessment.confidence ?? 0.7,
      source: 'ai',
    };
  }

  // Fallback: keyword matching on address
  const addr = smartInput.address.toLowerCase();
  const keywordMap: Array<[string[], EstimateInput['site']['siteType']]> = [
    [['hotel', 'inn', 'suites', 'resort', 'lodge', 'motel'], 'hotel'],
    [['apt', 'apartment', 'living', 'residences', 'lofts', 'condo'], 'apartment'],
    [['hospital', 'medical', 'clinic', 'health'], 'hospital'],
    [['school', 'university', 'college', 'academy'], 'school'],
    [['church', 'temple', 'mosque', 'synagogue'], 'other'],
    [['mall', 'plaza', 'shopping', 'retail', 'store', 'market'], 'retail'],
    [['office', 'tower', 'corporate', 'business'], 'office'],
    [['restaurant', 'cafe', 'diner', 'grill', 'bistro'], 'restaurant'],
    [['garage', 'parking'], 'parking_structure'],
    [['gas', 'fuel', 'truck stop', 'travel center'], 'fuel_station'],
    [['airport', 'terminal', 'aviation'], 'airport'],
    [['industrial', 'warehouse', 'factory', 'plant'], 'industrial'],
    [['campground', 'rv park', 'camp'], 'campground'],
    [['fleet', 'dealer', 'auto'], 'fleet_dealer'],
    [['police', 'fire station', 'government', 'city hall', 'municipal'], 'municipal'],
  ];

  for (const [keywords, siteType] of keywordMap) {
    if (keywords.some((k) => addr.includes(k))) {
      return { value: siteType, confidence: 0.5, source: 'knowledge_base' };
    }
  }

  return { value: 'other', confidence: 0.3, source: 'default' };
}

function inferParkingEnvironment(
  smartInput: SmartEstimateInput,
  siteType: EstimateInput['site']['siteType'],
): {
  type: EstimateInput['parkingEnvironment']['type'];
  surfaceType: EstimateInput['parkingEnvironment']['surfaceType'];
  hasPTSlab: boolean;
  confidence: number;
  source: HumanReviewItem['source'];
} {
  const assessment = smartInput.siteAssessment;
  const rec = getSiteRecommendation(siteType);

  const parkingType = (assessment?.parkingType as EstimateInput['parkingEnvironment']['type'])
    ?? (rec.parkingType as EstimateInput['parkingEnvironment']['type'])
    ?? 'surface_lot';

  const surfaceType = (assessment?.surfaceType as EstimateInput['parkingEnvironment']['surfaceType'])
    ?? 'asphalt';

  const hasPTSlab = assessment?.hasPTSlab ?? (parkingType === 'parking_garage');

  const source: HumanReviewItem['source'] = assessment?.parkingType ? 'ai' : 'knowledge_base';
  const confidence = assessment?.parkingType ? 0.7 : 0.5;

  return { type: parkingType, surfaceType, hasPTSlab, confidence, source };
}

function inferChargerConfig(
  smartInput: SmartEstimateInput,
): {
  brand: string;
  model: string;
  count: number;
  chargingLevel: 'l2' | 'l3_dcfc';
  mountType: EstimateInput['charger']['mountType'];
  unitPrice: number;
  confidence: number;
} {
  const placements = smartInput.chargerPlacements;
  const count = placements.length;
  const hasL3 = placements.some((p) => p.type === 'l3');
  const allL3 = placements.every((p) => p.type === 'l3');

  // Default to Tesla UWC Gen3 for L2
  if (!hasL3) {
    return {
      brand: 'Tesla',
      model: 'Universal Wall Connector Gen 3',
      count,
      chargingLevel: 'l2',
      mountType: 'pedestal',
      unitPrice: 750,
      confidence: 0.9,
    };
  }

  if (allL3) {
    return {
      brand: 'Tesla',
      model: 'Supercharger V4',
      count,
      chargingLevel: 'l3_dcfc',
      mountType: 'pedestal',
      unitPrice: 50000,
      confidence: 0.6,
    };
  }

  // Mixed L2/L3 — use L3 as primary level since it drives electrical sizing,
  // but preserve the total count so both types are represented in the estimate.
  // The L3 pricing path handles larger infrastructure requirements.
  const l3Count = placements.filter((p) => p.type === 'l3').length;
  return {
    brand: 'Tesla',
    model: l3Count >= 1 ? 'Supercharger V4' : 'Universal Wall Connector Gen 3',
    count,
    chargingLevel: l3Count >= 1 ? 'l3_dcfc' : 'l2',
    mountType: 'pedestal',
    unitPrice: l3Count >= 1 ? 50000 : 750,
    confidence: 0.4,
  };
}

function calculateConduitDistance(
  panelLocation: [number, number],
  chargerPlacements: ReadonlyArray<{ coordinates: [number, number] }>,
): number {
  if (chargerPlacements.length === 0) return 0;

  // Calculate centroid of charger positions
  const centroid: [number, number] = [
    chargerPlacements.reduce((sum, p) => sum + p.coordinates[0], 0) / chargerPlacements.length,
    chargerPlacements.reduce((sum, p) => sum + p.coordinates[1], 0) / chargerPlacements.length,
  ];

  // Turf.js distance in meters, convert to feet
  const panelPt = point(panelLocation);
  const centroidPt = point(centroid);
  const distMeters = turfDistance(panelPt, centroidPt, { units: 'meters' });
  const distFt = distMeters * 3.281;

  // 1.3× routing factor for real-world routing (turns, obstacles)
  return Math.round(distFt * 1.3);
}

function inferElectricalConfig(
  chargingLevel: 'l2' | 'l3_dcfc',
  chargerCount: number,
): {
  serviceType: EstimateInput['electrical']['serviceType'];
  panelUpgradeRequired: boolean;
  transformerRequired: boolean;
  confidence: number;
} {
  if (chargingLevel === 'l3_dcfc') {
    return {
      serviceType: '480v_3phase',
      panelUpgradeRequired: true,
      transformerRequired: true,
      confidence: 0.8,
    };
  }

  return {
    serviceType: '208v',
    panelUpgradeRequired: chargerCount >= 4,
    transformerRequired: false,
    confidence: 0.7,
  };
}

function inferCivilWork(
  parkingType: EstimateInput['parkingEnvironment']['type'],
  surfaceType: EstimateInput['parkingEnvironment']['surfaceType'],
): {
  trenchingRequired: boolean;
  boringRequired: boolean;
  coringRequired: boolean;
  confidence: number;
} {
  // Garage → coring through concrete decks
  if (parkingType === 'parking_garage') {
    return {
      trenchingRequired: false,
      boringRequired: false,
      coringRequired: true,
      confidence: 0.7,
    };
  }

  // Surface lot + concrete → boring
  if (surfaceType === 'concrete') {
    return {
      trenchingRequired: false,
      boringRequired: true,
      coringRequired: false,
      confidence: 0.7,
    };
  }

  // Surface lot + asphalt → trenching (most common)
  return {
    trenchingRequired: true,
    boringRequired: false,
    coringRequired: false,
    confidence: 0.8,
  };
}

function inferAccessories(
  chargerCount: number,
  parkingType: EstimateInput['parkingEnvironment']['type'],
): {
  bollardQty: number;
  signQty: number;
  wheelStopQty: number;
  stripingRequired: boolean;
  padRequired: boolean;
} {
  return {
    bollardQty: chargerCount,
    signQty: chargerCount,
    wheelStopQty: parkingType === 'surface_lot' ? chargerCount : 0,
    stripingRequired: true,
    padRequired: parkingType === 'surface_lot',
  };
}

function inferDesignEngineering(
  chargerCount: number,
  transformerRequired: boolean,
): {
  responsibility: 'bullet';
  stampedPlansRequired: boolean;
  confidence: number;
} {
  return {
    responsibility: 'bullet' as const,
    stampedPlansRequired: chargerCount >= 4 || transformerRequired,
    confidence: 0.8,
  };
}

function inferNetwork(): {
  type: 'cellular_router';
  wifiInstallResponsibility: 'bullet';
} {
  return {
    type: 'cellular_router',
    wifiInstallResponsibility: 'bullet',
  };
}

function setFullTurnkeyDefaults(): {
  permit: { responsibility: 'bullet'; feeAllowance: number };
  makeReady: { responsibility: 'bullet' };
  chargerInstall: { responsibility: 'bullet' };
  purchasingChargers: { responsibility: 'bullet' };
  signageBollards: { responsibility: 'signage_bollards' };
} {
  return {
    permit: { responsibility: 'bullet', feeAllowance: 500 },
    makeReady: { responsibility: 'bullet' },
    chargerInstall: { responsibility: 'bullet' },
    purchasingChargers: { responsibility: 'bullet' },
    signageBollards: { responsibility: 'signage_bollards' },
  };
}

// ── Main export ──

export function buildSmartEstimate(smartInput: SmartEstimateInput): SmartEstimateResult {
  const reviewItems: HumanReviewItem[] = [];
  const base = emptyInput();

  // 1. Infer site type
  const siteResult = inferSiteType(smartInput);
  if (siteResult.confidence < 0.6) {
    reviewItems.push({
      field: 'site.siteType',
      inferredValue: siteResult.value,
      reason: `Low confidence site type inference (${Math.round(siteResult.confidence * 100)}%)`,
      source: siteResult.source,
    });
  }

  // 2. Infer parking environment
  const parkingResult = inferParkingEnvironment(smartInput, siteResult.value);
  if (parkingResult.confidence < 0.6) {
    reviewItems.push({
      field: 'parkingEnvironment.type',
      inferredValue: parkingResult.type,
      reason: 'Parking type inferred from defaults — verify on site',
      source: parkingResult.source,
    });
  }

  // 3. Infer charger config
  const chargerResult = inferChargerConfig(smartInput);
  addReviewIfHighVariance(
    reviewItems,
    'charger.model',
    chargerResult.model,
    'Charger model auto-selected based on placement types',
    'knowledge_base',
    'Tesla Universal Wall Connector (Gen 3) – Model 1734412‑02',
  );

  // 4. Calculate conduit distance
  const conduitFt = calculateConduitDistance(smartInput.panelLocation, smartInput.chargerPlacements);
  addReviewIfHighVariance(
    reviewItems,
    'mapWorkspace.conduitDistance_ft',
    conduitFt,
    `Conduit distance calculated from map (${conduitFt}ft with 1.3× routing factor)`,
    'knowledge_base',
    'Furnish & Install EMT Conduit-Up to 2" w/ up to #4 Conductors',
  );

  // 5. Infer electrical config
  const elecResult = inferElectricalConfig(chargerResult.chargingLevel, chargerResult.count);
  if (elecResult.transformerRequired) {
    reviewItems.push({
      field: 'electrical.transformerRequired',
      inferredValue: true,
      reason: 'L3 DCFC requires transformer — verify utility capacity',
      source: 'knowledge_base',
    });
  }
  if (elecResult.panelUpgradeRequired) {
    reviewItems.push({
      field: 'electrical.panelUpgradeRequired',
      inferredValue: true,
      reason: `Panel upgrade likely needed for ${chargerResult.count} chargers`,
      source: 'knowledge_base',
    });
  }

  // 6. Infer civil work
  const civilResult = inferCivilWork(parkingResult.type, parkingResult.surfaceType);
  if (civilResult.trenchingRequired) {
    addReviewIfHighVariance(
      reviewItems,
      'parkingEnvironment.trenchingRequired',
      true,
      'Trenching inferred from surface lot + asphalt',
      'knowledge_base',
      'Trenching (No Conduit)-Up to 36" W and no more than 4\' D',
    );
  }

  // 7. Infer accessories
  const accessoriesResult = inferAccessories(chargerResult.count, parkingResult.type);

  // 8. Infer design/engineering
  const designResult = inferDesignEngineering(chargerResult.count, elecResult.transformerRequired);
  if (designResult.stampedPlansRequired) {
    reviewItems.push({
      field: 'designEngineering.stampedPlansRequired',
      inferredValue: true,
      reason: chargerResult.count >= 4
        ? `Stamped plans required for ${chargerResult.count}+ charger installation`
        : 'Stamped plans required due to transformer installation',
      source: 'knowledge_base',
    });
  }

  // 9. Infer network
  const networkResult = inferNetwork();

  // 10. Set full turnkey defaults
  const turnkeyDefaults = setFullTurnkeyDefaults();

  // Calculate distance to panel from conduit calculation
  const distToPanel = conduitFt > 0 ? Math.round(conduitFt / 1.3) : null;

  // Junction box count: 1 per 100ft + 1 per charger branch
  const junctionBoxCount = conduitFt > 0
    ? Math.ceil(conduitFt / 100) + Math.max(0, chargerResult.count - 1)
    : null;

  // ── Build the full EstimateInput ──
  const estimateInput: EstimateInput = {
    ...base,
    project: {
      ...base.project,
      projectType: 'full_turnkey',
    },
    site: {
      ...base.site,
      address: smartInput.address,
      siteType: siteResult.value,
    },
    parkingEnvironment: {
      ...base.parkingEnvironment,
      type: parkingResult.type,
      surfaceType: parkingResult.surfaceType,
      hasPTSlab: parkingResult.hasPTSlab,
      slabScanRequired: parkingResult.hasPTSlab,
      coringRequired: civilResult.coringRequired,
      trenchingRequired: civilResult.trenchingRequired,
      boringRequired: civilResult.boringRequired,
      indoorOutdoor: parkingResult.type === 'parking_garage' ? 'indoor' : 'outdoor',
    },
    charger: {
      ...base.charger,
      brand: chargerResult.brand,
      model: chargerResult.model,
      count: chargerResult.count,
      pedestalCount: chargerResult.mountType === 'pedestal' ? chargerResult.count : 0,
      portType: 'single',
      mountType: chargerResult.mountType,
      isCustomerSupplied: false,
      chargingLevel: chargerResult.chargingLevel,
      volts: elecResult.serviceType === '480v_3phase' ? 480 : 208,
    },
    electrical: {
      ...base.electrical,
      serviceType: elecResult.serviceType,
      panelUpgradeRequired: elecResult.panelUpgradeRequired,
      transformerRequired: elecResult.transformerRequired,
      distanceToPanel_ft: distToPanel,
      junctionBoxCount,
    },
    civil: {
      installationLocationDescription: `${parkingResult.type?.replace('_', ' ')} — ${parkingResult.surfaceType} surface`,
    },
    permit: turnkeyDefaults.permit,
    designEngineering: {
      responsibility: designResult.responsibility,
      stampedPlansRequired: designResult.stampedPlansRequired,
    },
    network: {
      type: networkResult.type,
      wifiInstallResponsibility: networkResult.wifiInstallResponsibility,
    },
    accessories: {
      ...accessoriesResult,
      debrisRemoval: true,
    },
    makeReady: turnkeyDefaults.makeReady,
    chargerInstall: turnkeyDefaults.chargerInstall,
    purchasingChargers: turnkeyDefaults.purchasingChargers,
    signageBollards: turnkeyDefaults.signageBollards,
    estimateControls: {
      pricingTier: 'msrp',
      taxRate: 7.0,
      contingencyPercent: 10,
      markupPercent: 20,
    },
    notes: '',
    mapWorkspace: {
      conduitDistance_ft: conduitFt,
      feederDistance_ft: elecResult.transformerRequired ? Math.round(conduitFt * 0.3) : null,
      trenchingDistance_ft: civilResult.trenchingRequired ? conduitFt : null,
      boringDistance_ft: civilResult.boringRequired ? conduitFt : null,
      concreteCuttingDistance_ft: civilResult.coringRequired ? Math.round(conduitFt * 0.2) : null,
      chargerCountFromMap: chargerResult.count,
      siteCoordinates: smartInput.siteCoordinates,
      pvcConduitDistance_ft: null,
      cableTrayDistance_ft: null,
      concretePadCount: chargerResult.mountType === 'pedestal' ? chargerResult.count : null,
      hasPanelPlaced: true,
      lightingCount: null,
    },
  };

  // Calculate overall confidence as weighted average
  const confidences = [
    { weight: 2, value: siteResult.confidence },
    { weight: 2, value: parkingResult.confidence },
    { weight: 3, value: chargerResult.confidence },
    { weight: 2, value: elecResult.confidence },
    { weight: 1, value: civilResult.confidence },
    { weight: 1, value: designResult.confidence },
  ];
  const totalWeight = confidences.reduce((s, c) => s + c.weight, 0);
  const overallConfidence = confidences.reduce((s, c) => s + c.weight * c.value, 0) / totalWeight;

  return {
    input: estimateInput,
    confidence: Math.round(overallConfidence * 100) / 100,
    humanReviewItems: reviewItems,
  };
}

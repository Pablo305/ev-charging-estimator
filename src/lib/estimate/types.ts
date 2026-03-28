// ============================================================
// Tabular SOW import (from parse-sow / pasted proposals)
// ============================================================

export interface SOWLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  category?: string;
  /** Matched pricebook item id when parser could align to catalog */
  catalogMatch?: string;
}

// ============================================================
// Normalized SOW Input
// ============================================================

export interface EstimateInput {
  project: {
    name: string;
    salesRep: string;
    projectType:
      | 'full_turnkey'
      | 'full_turnkey_connectivity'
      | 'equipment_install_commission'
      | 'install_commission'
      | 'equipment_purchase'
      | 'remove_replace'
      | 'commission_only'
      | 'service_work'
      | 'supercharger';
    timeline: string;
    isNewConstruction: boolean | null;
  };
  customer: {
    companyName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    billingAddress: string;
  };
  site: {
    address: string;
    siteType:
      | 'airport'
      | 'apartment'
      | 'event_venue'
      | 'fleet_dealer'
      | 'hospital'
      | 'hotel'
      | 'industrial'
      | 'mixed_use'
      | 'fuel_station'
      | 'municipal'
      | 'office'
      | 'parking_structure'
      | 'police_gov'
      | 'recreational'
      | 'campground'
      | 'restaurant'
      | 'retail'
      | 'school'
      | 'other'
      | null;
    state: string;
  };
  parkingEnvironment: {
    type: 'surface_lot' | 'parking_garage' | 'mixed' | null;
    hasPTSlab: boolean | null;
    slabScanRequired: boolean | null;
    coringRequired: boolean | null;
    surfaceType: 'asphalt' | 'concrete' | 'gravel' | 'other' | null;
    trenchingRequired: boolean | null;
    boringRequired: boolean | null;
    trafficControlRequired: boolean | null;
    indoorOutdoor: 'indoor' | 'outdoor' | 'both' | null;
    fireRatedPenetrations: boolean | null;
    accessRestrictions: string;
  };
  charger: {
    brand: string;
    model: string;
    count: number;
    pedestalCount: number;
    portType: 'single' | 'dual' | 'mix' | null;
    mountType: 'pedestal' | 'wall' | 'mix' | 'other' | null;
    isCustomerSupplied: boolean;
    chargingLevel: 'l2' | 'l3_dcfc' | null;
    ampsPerCharger: number | null;
    volts: number | null;
  };
  electrical: {
    serviceType:
      | '120v'
      | '208v'
      | '240v'
      | '480v_3phase'
      | 'unknown'
      | null;
    availableCapacityKnown: boolean;
    availableAmps: number | null;
    breakerSpaceAvailable: boolean | null;
    panelUpgradeRequired: boolean | null;
    transformerRequired: boolean | null;
    switchgearRequired: boolean | null;
    distanceToPanel_ft: number | null;
    utilityCoordinationRequired: boolean | null;
    /** Map / plan placement of a dedicated meter room / service entrance building */
    meterRoomRequired: boolean | null;
    /** Count of pull/junction boxes suggested from map markers */
    junctionBoxCount: number | null;
    /** Disconnect switch required (from map placement) */
    disconnectRequired: boolean | null;
    electricalRoomDescription: string;
    /** Optional feeder breakdown (tabular SOW / advanced entry) */
    pvcConduit4in_ft?: number | null;
    pvcConduit3in_ft?: number | null;
    pvcConduit1in_ft?: number | null;
    wire500mcm_ft?: number | null;
  };
  civil: {
    installationLocationDescription: string;
    /** Open trench LF (often shorter than full conduit run to panel); SOW / site walk */
    trenchDistance_ft?: number | null;
    /** From tabular SOW / site walk */
    asphaltRemoval_sf?: number | null;
    asphaltRestore_sf?: number | null;
    encasement_CY?: number | null;
    postFoundation_CY?: number | null;
    cabinetPad_CY?: number | null;
    groundPrepCabinet?: boolean | null;
  };
  permit: {
    responsibility: 'bullet' | 'client' | 'tbd' | null;
    feeAllowance: number | null;
  };
  designEngineering: {
    responsibility: 'bullet' | 'client' | 'tbd' | null;
    stampedPlansRequired: boolean | null;
  };
  network: {
    type:
      | 'none'
      | 'customer_lan'
      | 'wifi_bridge'
      | 'cellular_router'
      | 'included_in_package'
      | null;
    wifiInstallResponsibility: 'bullet' | 'client' | 'na' | 'tbd' | null;
  };
  accessories: {
    bollardQty: number;
    signQty: number;
    wheelStopQty: number;
    stripingRequired: boolean;
    padRequired: boolean;
    debrisRemoval: boolean;
  };
  makeReady: {
    responsibility: 'bullet' | 'client' | 'tbd' | null;
  };
  chargerInstall: {
    responsibility: 'bullet' | 'client' | 'tbd' | null;
  };
  purchasingChargers: {
    responsibility: 'bullet' | 'client' | 'tbd' | null;
  };
  signageBollards: {
    responsibility:
      | 'signage'
      | 'bollards'
      | 'signage_bollards'
      | 'none'
      | 'tbd'
      | null;
  };
  estimateControls: {
    pricingTier: 'bulk_discount' | 'msrp';
    taxRate: number;
    contingencyPercent: number;
    markupPercent: number;
  };
  notes: string;
  mapWorkspace?: {
    conduitDistance_ft: number | null;
    feederDistance_ft: number | null;
    trenchingDistance_ft: number | null;
    boringDistance_ft: number | null;
    concreteCuttingDistance_ft: number | null;
    chargerCountFromMap: number | null;
    siteCoordinates: [number, number] | null;
    /** PVC conduit distance from map */
    pvcConduitDistance_ft: number | null;
    /** Cable tray distance from map */
    cableTrayDistance_ft: number | null;
    /** Number of concrete pads placed on map */
    concretePadCount: number | null;
    /** Whether electrical panel marker was placed on map */
    hasPanelPlaced: boolean | null;
    /** Number of lighting fixtures placed on map */
    lightingCount: number | null;
    /** Captured Mapbox canvas screenshot for PDF export */
    mapSnapshotDataUrl?: string;
    drawings?: {
      runs: Array<{ id: string; runType: string; geometry: { type: string; coordinates: number[][] }; lengthFt: number; label: string; createdAt?: string }>;
      equipment: Array<{ id: string; equipmentType: string; geometry: { type: string; coordinates: number[] }; label: string }>;
    } | null;
  };
  removeReplace?: {
    existingChargerCount: number | null;
    existingBrand: string | null;
    existingPortType: string | null;
    existingMountStyle: string | null;
    ampsPerCharger: string | null;
  };
  /** When present (tabular SOW), engine may build line items from pasted pricing */
  rawLineItems?: SOWLineItem[];
}

// ============================================================
// Estimate Output
// ============================================================

export type EstimateCategory =
  | 'CHARGER'
  | 'PEDESTAL'
  | 'CIVIL'
  | 'DES/ENG'
  | 'ELEC'
  | 'ELEC LBR'
  | 'ELEC LBR MAT'
  | 'ELEC MAT'
  | 'MATERIAL'
  | 'MISC'
  | 'NETWORK'
  | 'PERMIT'
  | 'SAFETY'
  | 'SITE WORK'
  | 'SOFTWARE'
  | 'SERVICE_FEE'
  | 'EXCLUSION';

export interface EstimateLineItem {
  id: string;
  category: EstimateCategory;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  extendedPrice: number;
  pricingSource:
    | 'catalog'
    | 'catalog_bulk'
    | 'catalog_msrp'
    | 'catalog_override'
    | 'calculated'
    | 'allowance'
    | 'manual_override'
    | 'tbd'
    | 'industry_standard'
    | 'sow_import';
  ruleName: string;
  ruleReason: string;
  sourceInputs: string[];
  manualReviewRequired: boolean;
  manualReviewReason?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface EstimateExclusion {
  id: string;
  text: string;
  category: string;
  reason: string;
  isStandard: boolean;
}

export interface ManualReviewTrigger {
  id: string;
  field: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

/** Observed price range check from pricebook-v2.json (real proposals). */
export interface PriceValidationIssue {
  lineItemId: string;
  description: string;
  unitPrice: number;
  observedMin: number;
  observedMax: number;
  observedMedian: number;
  status: 'in_range' | 'below_observed' | 'above_observed';
  /** True when unit price was adjusted to observed median (D2 calibration). */
  adjustedToMedian?: boolean;
}

export interface EstimateOutput {
  input: EstimateInput;
  lineItems: EstimateLineItem[];
  exclusions: EstimateExclusion[];
  manualReviewTriggers: ManualReviewTrigger[];
  summary: {
    /** Post-markup subtotal (lineItemTotal * (1 + markupPercent/100)) */
    subtotal: number;
    /** Pre-markup sum of all line item extendedPrice values */
    lineItemTotal: number;
    tax: number;
    contingency: number;
    total: number;
    hardwareTotal: number;
    installationTotal: number;
    permitDesignTotal: number;
    networkTotal: number;
    accessoriesTotal: number;
    serviceTotal: number;
  };
  metadata: {
    generatedAt: string;
    engineVersion: string;
    inputCompleteness: number;
    automationConfidence: 'high' | 'medium' | 'low';
    requiresManualReview: boolean;
    /** Per-line checks against observed proposal price ranges (non-sow_import). */
    priceValidation?: PriceValidationIssue[];
  };
}

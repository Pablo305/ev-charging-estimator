import { EstimateInput } from './types';

// ============================================================
// Sample Scenarios
// ============================================================

export interface Scenario {
  id: string;
  name: string;
  description: string;
  input: EstimateInput;
}

// ── 1. Hampton Inn Surface Lot ───────────────────────────────

const hamptonInn: EstimateInput = {
  project: {
    name: 'Hampton Inn - Marietta, GA',
    salesRep: 'John Smith',
    projectType: 'full_turnkey',
    timeline: '6-8 weeks',
    isNewConstruction: false,
  },
  customer: {
    companyName: 'Hampton Inn Marietta LLC',
    contactName: 'Sarah Johnson',
    contactEmail: 'sjohnson@hamptonmarietta.com',
    contactPhone: '770-555-0123',
    billingAddress: '455 Franklin Gateway SE, Marietta, GA 30067',
  },
  site: {
    address: '455 Franklin Gateway SE, Marietta, GA 30067',
    siteType: 'hotel',
    state: 'GA',
  },
  parkingEnvironment: {
    type: 'surface_lot',
    hasPTSlab: false,
    slabScanRequired: false,
    coringRequired: false,
    surfaceType: 'asphalt',
    trenchingRequired: true,
    boringRequired: false,
    trafficControlRequired: false,
    indoorOutdoor: 'outdoor',
    fireRatedPenetrations: false,
    accessRestrictions: 'Guest parking only after 6 PM',
  },
  charger: {
    brand: 'Tesla',
    model: 'Universal Wall Connector',
    count: 4,
    pedestalCount: 4,
    portType: 'single',
    mountType: 'pedestal',
    isCustomerSupplied: false,
    chargingLevel: 'l2',
    ampsPerCharger: 48,
    volts: 240,
  },
  electrical: {
    serviceType: '208v',
    availableCapacityKnown: true,
    availableAmps: 200,
    breakerSpaceAvailable: true,
    panelUpgradeRequired: false,
    transformerRequired: false,
    switchgearRequired: false,
    distanceToPanel_ft: 85,
    utilityCoordinationRequired: false,
    electricalRoomDescription: 'Main electrical room ground floor near loading dock',
  },
  civil: {
    installationLocationDescription:
      'Southeast corner of parking lot, near building entrance. 4 dedicated spots along the building wall.',
  },
  permit: {
    responsibility: 'bullet',
    feeAllowance: 800,
  },
  designEngineering: {
    responsibility: 'bullet',
    stampedPlansRequired: false,
  },
  network: {
    type: 'wifi_bridge',
    wifiInstallResponsibility: 'bullet',
  },
  accessories: {
    bollardQty: 8,
    signQty: 4,
    wheelStopQty: 4,
    stripingRequired: true,
    padRequired: false,
    debrisRemoval: true,
  },
  makeReady: {
    responsibility: 'bullet',
  },
  chargerInstall: {
    responsibility: 'bullet',
  },
  purchasingChargers: {
    responsibility: 'bullet',
  },
  signageBollards: {
    responsibility: 'signage_bollards',
  },
  estimateControls: {
    pricingTier: 'bulk_discount',
    taxRate: 7.0,
    contingencyPercent: 10,
    markupPercent: 20,
  },
  notes: 'Hotel wants chargers operational before summer travel season. Guest-facing, needs clean appearance.',
};

// ── 2. Downtown Apartment Garage ─────────────────────────────

const downtownApartment: EstimateInput = {
  project: {
    name: 'The Metropolitan - Parking Garage L6',
    salesRep: 'Mike Chen',
    projectType: 'full_turnkey',
    timeline: '8-12 weeks',
    isNewConstruction: false,
  },
  customer: {
    companyName: 'Metro Property Management',
    contactName: 'David Park',
    contactEmail: 'dpark@metroproperty.com',
    contactPhone: '404-555-0456',
    billingAddress: '1200 Peachtree St NE, Atlanta, GA 30309',
  },
  site: {
    address: '1200 Peachtree St NE, Atlanta, GA 30309',
    siteType: 'apartment',
    state: 'GA',
  },
  parkingEnvironment: {
    type: 'parking_garage',
    hasPTSlab: null, // Unknown - this should trigger review
    slabScanRequired: null,
    coringRequired: null,
    surfaceType: 'concrete',
    trenchingRequired: false,
    boringRequired: false,
    trafficControlRequired: true,
    indoorOutdoor: 'indoor',
    fireRatedPenetrations: true,
    accessRestrictions: 'Resident access only. Work must be done M-F 8am-5pm. Elevator required for equipment.',
  },
  charger: {
    brand: 'Tesla',
    model: 'Universal Wall Connector',
    count: 4,
    pedestalCount: 0,
    portType: 'single',
    mountType: 'wall',
    isCustomerSupplied: false,
    chargingLevel: 'l2',
    ampsPerCharger: 48,
    volts: 240,
  },
  electrical: {
    serviceType: '208v',
    availableCapacityKnown: false, // Unknown - should trigger review
    availableAmps: null,
    breakerSpaceAvailable: null,
    panelUpgradeRequired: null,
    transformerRequired: false,
    switchgearRequired: false,
    distanceToPanel_ft: 150, // Long run
    utilityCoordinationRequired: false,
    electricalRoomDescription: 'Electrical room on P1 level. Chargers on P6. Must route through 5 floors.',
  },
  civil: {
    installationLocationDescription:
      '6th floor of parking garage, against east wall. Wall-mount installation. Conduit must route from P1 electrical room up through 5 floors.',
  },
  permit: {
    responsibility: 'bullet',
    feeAllowance: null, // Unknown
  },
  designEngineering: {
    responsibility: 'bullet',
    stampedPlansRequired: true,
  },
  network: {
    type: 'cellular_router',
    wifiInstallResponsibility: 'na',
  },
  accessories: {
    bollardQty: 0,
    signQty: 4,
    wheelStopQty: 0,
    stripingRequired: true,
    padRequired: false,
    debrisRemoval: true,
  },
  makeReady: {
    responsibility: 'bullet',
  },
  chargerInstall: {
    responsibility: 'bullet',
  },
  purchasingChargers: {
    responsibility: 'bullet',
  },
  signageBollards: {
    responsibility: 'signage',
  },
  estimateControls: {
    pricingTier: 'msrp',
    taxRate: 8.0,
    contingencyPercent: 15,
    markupPercent: 25,
  },
  notes:
    'Complex garage installation. PT slab status unknown - must verify before any concrete penetrations. Long conduit run across multiple floors. Residents must have parking access during construction.',
};

// ── 3. Mixed Environment Complex ─────────────────────────────

const mixedComplex: EstimateInput = {
  project: {
    name: 'Riverside Mixed-Use Development',
    salesRep: 'Emily Rodriguez',
    projectType: 'full_turnkey_connectivity',
    timeline: '10-14 weeks',
    isNewConstruction: true,
  },
  customer: {
    companyName: 'Riverside Development Corp',
    contactName: 'James Wilson',
    contactEmail: 'jwilson@riversidedev.com',
    contactPhone: '678-555-0789',
    billingAddress: '500 Riverside Pkwy, Lawrenceville, GA 30046',
  },
  site: {
    address: '500 Riverside Pkwy, Lawrenceville, GA 30046',
    siteType: 'mixed_use',
    state: 'GA',
  },
  parkingEnvironment: {
    type: 'mixed', // Should trigger manual review
    hasPTSlab: true,
    slabScanRequired: true,
    coringRequired: true,
    surfaceType: 'concrete',
    trenchingRequired: true,
    boringRequired: true,
    trafficControlRequired: true,
    indoorOutdoor: 'both',
    fireRatedPenetrations: true,
    accessRestrictions:
      'Commercial tenants M-F. Residential 24/7. Coordinate with property management.',
  },
  charger: {
    brand: 'ChargePoint',
    model: 'CT4000',
    count: 6,
    pedestalCount: 4,
    portType: 'dual',
    mountType: 'mix',
    isCustomerSupplied: false,
    chargingLevel: 'l2',
    ampsPerCharger: 40,
    volts: 208,
  },
  electrical: {
    serviceType: '208v',
    availableCapacityKnown: true,
    availableAmps: 400,
    breakerSpaceAvailable: true,
    panelUpgradeRequired: false,
    transformerRequired: false,
    switchgearRequired: true,
    distanceToPanel_ft: 120,
    utilityCoordinationRequired: true,
    electricalRoomDescription:
      'New construction - electrical room in parking structure B1 level',
  },
  civil: {
    installationLocationDescription:
      'Split installation: 4 chargers on surface lot (retail area), 2 wall-mount in parking garage (residential). Two separate electrical runs needed.',
  },
  permit: {
    responsibility: 'bullet',
    feeAllowance: 2500,
  },
  designEngineering: {
    responsibility: 'bullet',
    stampedPlansRequired: true,
  },
  network: {
    type: 'customer_lan',
    wifiInstallResponsibility: 'client',
  },
  accessories: {
    bollardQty: 8,
    signQty: 6,
    wheelStopQty: 4,
    stripingRequired: true,
    padRequired: true,
    debrisRemoval: true,
  },
  makeReady: {
    responsibility: 'bullet',
  },
  chargerInstall: {
    responsibility: 'bullet',
  },
  purchasingChargers: {
    responsibility: 'bullet',
  },
  signageBollards: {
    responsibility: 'signage_bollards',
  },
  estimateControls: {
    pricingTier: 'msrp',
    taxRate: 7.0,
    contingencyPercent: 15,
    markupPercent: 20,
  },
  notes:
    'Mixed-use new construction. Complex split installation across surface and garage. Dual-port chargers for higher utilization. Utility coordination needed for new service.',
};

// ── 4. Tesla Supercharger Station ────────────────────────────

const superchargerStation: EstimateInput = {
  project: {
    name: 'QuickStop Fuel - Tesla Supercharger',
    salesRep: 'Chris Taylor',
    projectType: 'supercharger',
    timeline: '12-16 weeks',
    isNewConstruction: false,
  },
  customer: {
    companyName: 'QuickStop Fuel Holdings',
    contactName: 'Robert Kim',
    contactEmail: 'rkim@quickstopfuel.com',
    contactPhone: '770-555-0234',
    billingAddress: '8900 I-85 Frontage Rd, Commerce, GA 30529',
  },
  site: {
    address: '8900 I-85 Frontage Rd, Commerce, GA 30529',
    siteType: 'fuel_station',
    state: 'GA',
  },
  parkingEnvironment: {
    type: 'surface_lot',
    hasPTSlab: false,
    slabScanRequired: false,
    coringRequired: false,
    surfaceType: 'concrete',
    trenchingRequired: true,
    boringRequired: false,
    trafficControlRequired: true,
    indoorOutdoor: 'outdoor',
    fireRatedPenetrations: false,
    accessRestrictions: 'Active fuel station - coordinate with station manager for work zones',
  },
  charger: {
    brand: 'Tesla',
    model: 'Supercharger',
    count: 4,
    pedestalCount: 0,
    portType: 'single',
    mountType: 'pedestal',
    isCustomerSupplied: false,
    chargingLevel: 'l3_dcfc',
    ampsPerCharger: null,
    volts: 480,
  },
  electrical: {
    serviceType: '480v_3phase',
    availableCapacityKnown: true,
    availableAmps: 600,
    breakerSpaceAvailable: true,
    panelUpgradeRequired: false,
    transformerRequired: true,
    switchgearRequired: false,
    distanceToPanel_ft: 60,
    utilityCoordinationRequired: true,
    electricalRoomDescription: 'Existing 480V 3-phase service at fuel station. Dedicated pad for transformer.',
  },
  civil: {
    installationLocationDescription:
      'Dedicated EV charging island adjacent to fuel canopy. New concrete pad required. Trenching from transformer to charging island.',
  },
  permit: {
    responsibility: 'bullet',
    feeAllowance: 3000,
  },
  designEngineering: {
    responsibility: 'bullet',
    stampedPlansRequired: true,
  },
  network: {
    type: 'included_in_package',
    wifiInstallResponsibility: 'na',
  },
  accessories: {
    bollardQty: 4,
    signQty: 2,
    wheelStopQty: 4,
    stripingRequired: true,
    padRequired: true,
    debrisRemoval: true,
  },
  makeReady: {
    responsibility: 'bullet',
  },
  chargerInstall: {
    responsibility: 'bullet',
  },
  purchasingChargers: {
    responsibility: 'bullet',
  },
  signageBollards: {
    responsibility: 'signage_bollards',
  },
  estimateControls: {
    pricingTier: 'bulk_discount',
    taxRate: 7.0,
    contingencyPercent: 10,
    markupPercent: 15,
  },
  notes:
    'Tesla Standard 4-Stall Supercharger at existing fuel station. Public pay-per-use model ($0.10/kWh recurring). Utility coordination required for new 480V service.',
};

// ── Export All ────────────────────────────────────────────────

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'hampton-inn',
    name: 'Hampton Inn Surface Lot',
    description:
      '4x Tesla UWC, pedestal mount, surface parking lot, Full Turnkey. Typical hotel installation.',
    input: hamptonInn,
  },
  {
    id: 'downtown-apartment',
    name: 'Downtown Apartment Garage',
    description:
      '4x Tesla UWC, wall mount, parking garage (6th floor), PT slab unknown. Complex garage installation.',
    input: downtownApartment,
  },
  {
    id: 'mixed-complex',
    name: 'Mixed Environment Complex',
    description:
      '6x ChargePoint CT4000, mixed parking (garage + surface), mixed mount types. Triggers manual review.',
    input: mixedComplex,
  },
  {
    id: 'supercharger-station',
    name: 'Tesla Supercharger Station',
    description:
      'Standard 4-Stall Supercharger, surface lot, fuel station, Full Turnkey + Connectivity.',
    input: superchargerStation,
  },
] as const;

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

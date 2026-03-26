import { EstimateInput } from './types';

// ============================================================
// Sample Scenarios — 4 original + 10 from real proposals
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
    meterRoomRequired: null,
    junctionBoxCount: null,
    disconnectRequired: null, electricalRoomDescription: 'Main electrical room ground floor near loading dock',
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
    meterRoomRequired: null,
    junctionBoxCount: null,
    disconnectRequired: null, electricalRoomDescription: 'Electrical room on P1 level. Chargers on P6. Must route through 5 floors.',
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
    meterRoomRequired: null,
    junctionBoxCount: null,
    disconnectRequired: null, electricalRoomDescription:
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
    meterRoomRequired: null,
    junctionBoxCount: null,
    disconnectRequired: null, electricalRoomDescription: 'Existing 480V 3-phase service at fuel station. Dedicated pad for transformer.',
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

// ════════════════════════════════════════════════════════════════
// NEW SCENARIOS — from real anonymized proposals
// ════════════════════════════════════════════════════════════════

// ── 5. Hotel Surface Lot (like Hampton Inn) ──────────────────

const hotelSurfaceLot: EstimateInput = {
  project: {
    name: 'Riverside Inn - Surface Lot EV Install',
    salesRep: 'Alex Martinez',
    projectType: 'full_turnkey',
    timeline: '5-7 weeks',
    isNewConstruction: false,
  },
  customer: {
    companyName: 'Riverside Hospitality Group',
    contactName: 'Karen Mitchell',
    contactEmail: 'kmitchell@riversideinn.com',
    contactPhone: '512-555-0198',
    billingAddress: '2200 N IH-35, Round Rock, TX 78681',
  },
  site: {
    address: '2200 N IH-35, Round Rock, TX 78681',
    siteType: 'hotel',
    state: 'TX',
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
    accessRestrictions: 'Guest parking lot. Work allowed 8am-5pm weekdays only.',
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
    distanceToPanel_ft: 110,
    utilityCoordinationRequired: false,
    meterRoomRequired: null,
    junctionBoxCount: null,
    disconnectRequired: null, electricalRoomDescription: 'Electrical closet on first floor, east side of building.',
  },
  civil: {
    installationLocationDescription:
      '4 pedestals along north edge of lot, adjacent to building. Trench across asphalt from electrical closet to first pedestal, then daisy-chain.',
  },
  permit: {
    responsibility: 'bullet',
    feeAllowance: 900,
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
    taxRate: 8.25,
    contingencyPercent: 10,
    markupPercent: 20,
  },
  notes: 'Standard hotel surface lot install. 4 Tesla UWC on pedestals. Asphalt trenching required. Guest-facing — clean finish important.',
};

// ── 6. Hilton Property (like Home2 Suites) ───────────────────

const hiltonProperty: EstimateInput = {
  project: {
    name: 'Home2 Suites - Cedar Park EV Deployment',
    salesRep: 'Alex Martinez',
    projectType: 'full_turnkey',
    timeline: '8-10 weeks',
    isNewConstruction: false,
  },
  customer: {
    companyName: 'Hilton Franchise Holdings TX',
    contactName: 'Brian Caldwell',
    contactEmail: 'bcaldwell@hiltonfranchise.com',
    contactPhone: '512-555-0334',
    billingAddress: '1600 E Whitestone Blvd, Cedar Park, TX 78613',
  },
  site: {
    address: '1600 E Whitestone Blvd, Cedar Park, TX 78613',
    siteType: 'hotel',
    state: 'TX',
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
    accessRestrictions: 'Active hotel, guest parking 24/7. Must maintain minimum 80% lot access during work.',
  },
  charger: {
    brand: 'Tesla',
    model: 'Universal Wall Connector',
    count: 8,
    pedestalCount: 8,
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
    availableAmps: 400,
    breakerSpaceAvailable: true,
    panelUpgradeRequired: false,
    transformerRequired: false,
    switchgearRequired: false,
    distanceToPanel_ft: 140,
    utilityCoordinationRequired: false,
    meterRoomRequired: null,
    junctionBoxCount: 2,
    disconnectRequired: null, electricalRoomDescription: 'Main electrical room at rear of building, ground floor. Long run to front lot.',
  },
  civil: {
    installationLocationDescription:
      '8 pedestals in two rows of 4, front parking lot near main entrance. Concrete surface. Single trench from electrical room along building perimeter to charging area.',
  },
  permit: {
    responsibility: 'bullet',
    feeAllowance: 1200,
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
    bollardQty: 16,
    signQty: 8,
    wheelStopQty: 8,
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
    taxRate: 8.25,
    contingencyPercent: 10,
    markupPercent: 18,
  },
  notes: 'Hilton brand property — 8 Tesla UWC pedestal-mount on concrete lot. Long conduit run. Traffic control needed due to active guest parking. Phased installation recommended.',
};

// ── 7. Luxury Apartments (like Costa Bella) ──────────────────

const luxuryApartments: EstimateInput = {
  project: {
    name: 'Vista Bella Luxury Apartments - EV Amenity',
    salesRep: 'Emily Rodriguez',
    projectType: 'full_turnkey',
    timeline: '6-8 weeks',
    isNewConstruction: false,
  },
  customer: {
    companyName: 'Vista Bella Management LLC',
    contactName: 'Laura Reyes',
    contactEmail: 'lreyes@vistabella.com',
    contactPhone: '210-555-0467',
    billingAddress: '4500 La Cantera Pkwy, San Antonio, TX 78256',
  },
  site: {
    address: '4500 La Cantera Pkwy, San Antonio, TX 78256',
    siteType: 'apartment',
    state: 'TX',
  },
  parkingEnvironment: {
    type: 'surface_lot',
    hasPTSlab: false,
    slabScanRequired: false,
    coringRequired: false,
    surfaceType: 'asphalt',
    trenchingRequired: true,
    boringRequired: true,
    trafficControlRequired: false,
    indoorOutdoor: 'outdoor',
    fireRatedPenetrations: false,
    accessRestrictions: 'Resident parking only. Must maintain fire lane access at all times.',
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
    distanceToPanel_ft: 95,
    utilityCoordinationRequired: false,
    meterRoomRequired: null,
    junctionBoxCount: 1,
    disconnectRequired: null, electricalRoomDescription: 'Meter bank near carport area. Sub-panel install required.',
  },
  civil: {
    installationLocationDescription:
      '4 pedestals in covered carport area. Mixed surface: asphalt lot with concrete sidewalk crossing. Boring under sidewalk required (~15 LF). Trench in asphalt ~60 LF.',
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
    bollardQty: 4,
    signQty: 4,
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
    taxRate: 8.25,
    contingencyPercent: 10,
    markupPercent: 20,
  },
  notes: 'Luxury apartment amenity install. Mixed asphalt/concrete surface requires boring under sidewalk. Resident-facing — aesthetics matter. Sub-panel install needed at meter bank.',
};

// ── 8. Medical Center (like Dallas Regional) ─────────────────

const medicalCenter: EstimateInput = {
  project: {
    name: 'Lone Star Medical Center - EV + Removal',
    salesRep: 'Chris Taylor',
    projectType: 'remove_replace',
    timeline: '4-6 weeks',
    isNewConstruction: false,
  },
  customer: {
    companyName: 'Lone Star Health Systems',
    contactName: 'Dr. Patricia Nguyen',
    contactEmail: 'pnguyen@lonestarmed.org',
    contactPhone: '214-555-0521',
    billingAddress: '7800 Medical District Dr, Dallas, TX 75235',
  },
  site: {
    address: '7800 Medical District Dr, Dallas, TX 75235',
    siteType: 'hospital',
    state: 'TX',
  },
  parkingEnvironment: {
    type: 'surface_lot',
    hasPTSlab: false,
    slabScanRequired: false,
    coringRequired: false,
    surfaceType: 'concrete',
    trenchingRequired: false,
    boringRequired: false,
    trafficControlRequired: true,
    indoorOutdoor: 'outdoor',
    fireRatedPenetrations: false,
    accessRestrictions: 'Hospital campus — emergency vehicle access must be maintained. Patient/visitor parking area, work limited to weekends.',
  },
  charger: {
    brand: 'Tesla',
    model: 'Universal Wall Connector',
    count: 2,
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
    availableCapacityKnown: true,
    availableAmps: 200,
    breakerSpaceAvailable: true,
    panelUpgradeRequired: false,
    transformerRequired: false,
    switchgearRequired: false,
    distanceToPanel_ft: 45,
    utilityCoordinationRequired: false,
    meterRoomRequired: null,
    junctionBoxCount: null,
    disconnectRequired: null, electricalRoomDescription: 'Utility closet adjacent to parking area. Short run to wall-mount locations.',
  },
  civil: {
    installationLocationDescription:
      'Remove 2 existing Level 2 chargers (old Blink units) from exterior wall. Install 2 Tesla UWC wall-mount in same locations. Reuse existing conduit.',
  },
  permit: {
    responsibility: 'bullet',
    feeAllowance: 500,
  },
  designEngineering: {
    responsibility: 'bullet',
    stampedPlansRequired: false,
  },
  network: {
    type: 'none',
    wifiInstallResponsibility: 'na',
  },
  accessories: {
    bollardQty: 0,
    signQty: 2,
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
    taxRate: 8.25,
    contingencyPercent: 5,
    markupPercent: 15,
  },
  removeReplace: {
    existingChargerCount: 2,
    existingBrand: 'Blink',
    existingPortType: 'single',
    existingMountStyle: 'wall',
    ampsPerCharger: '32',
  },
  notes: 'Remove & replace at hospital campus. Remove 2 old Blink units, install 2 Tesla UWC wall-mount. Reuse existing conduit. Weekend-only work due to hospital operations.',
};

// ── 9. Vineyard/Winery (like Barons Creek) ───────────────────

const vineyardWinery: EstimateInput = {
  project: {
    name: 'Hill Country Vineyards - Guest EV Charging',
    salesRep: 'Alex Martinez',
    projectType: 'full_turnkey',
    timeline: '4-6 weeks',
    isNewConstruction: false,
  },
  customer: {
    companyName: 'Hill Country Vineyards LLC',
    contactName: 'Thomas Becker',
    contactEmail: 'tbecker@hillcountryvineyards.com',
    contactPhone: '830-555-0278',
    billingAddress: '611 S Lincoln St, Fredericksburg, TX 78624',
  },
  site: {
    address: '611 S Lincoln St, Fredericksburg, TX 78624',
    siteType: 'recreational',
    state: 'TX',
  },
  parkingEnvironment: {
    type: 'surface_lot',
    hasPTSlab: false,
    slabScanRequired: false,
    coringRequired: false,
    surfaceType: 'gravel',
    trenchingRequired: true,
    boringRequired: false,
    trafficControlRequired: false,
    indoorOutdoor: 'outdoor',
    fireRatedPenetrations: false,
    accessRestrictions: 'Rural property. No work during weekend events (Fri-Sun). Gravel lot, limited hard surfaces.',
  },
  charger: {
    brand: 'Tesla',
    model: 'Universal Wall Connector',
    count: 2,
    pedestalCount: 2,
    portType: 'single',
    mountType: 'pedestal',
    isCustomerSupplied: false,
    chargingLevel: 'l2',
    ampsPerCharger: 48,
    volts: 240,
  },
  electrical: {
    serviceType: '240v',
    availableCapacityKnown: true,
    availableAmps: 200,
    breakerSpaceAvailable: true,
    panelUpgradeRequired: false,
    transformerRequired: false,
    switchgearRequired: false,
    distanceToPanel_ft: 75,
    utilityCoordinationRequired: false,
    meterRoomRequired: null,
    junctionBoxCount: null,
    disconnectRequired: null, electricalRoomDescription: 'Main panel in tasting room building. Run to parking area ~75 ft.',
  },
  civil: {
    installationLocationDescription:
      '2 pedestals at edge of gravel parking area near tasting room. Trenching in soft soil/gravel from building to pedestals. Concrete pads for each pedestal.',
  },
  permit: {
    responsibility: 'bullet',
    feeAllowance: 600,
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
    bollardQty: 4,
    signQty: 2,
    wheelStopQty: 2,
    stripingRequired: false,
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
    taxRate: 8.25,
    contingencyPercent: 10,
    markupPercent: 20,
  },
  notes: 'Rural vineyard property. Gravel lot — concrete pads required for pedestals. Soft-soil trenching. Travel adder may apply (Fredericksburg is 70+ mi from Austin). No weekend work allowed.',
};

// ── 10. Shopping Center (like Little Rd) ─────────────────────

const shoppingCenter: EstimateInput = {
  project: {
    name: 'Parkway Plaza - ChargePoint L2 Deployment',
    salesRep: 'Emily Rodriguez',
    projectType: 'full_turnkey_connectivity',
    timeline: '8-10 weeks',
    isNewConstruction: false,
  },
  customer: {
    companyName: 'Parkway Retail Properties',
    contactName: 'Steven Cho',
    contactEmail: 'scho@parkwayretail.com',
    contactPhone: '817-555-0692',
    billingAddress: '3200 Little Rd, Arlington, TX 76017',
  },
  site: {
    address: '3200 Little Rd, Arlington, TX 76017',
    siteType: 'retail',
    state: 'TX',
  },
  parkingEnvironment: {
    type: 'surface_lot',
    hasPTSlab: false,
    slabScanRequired: false,
    coringRequired: false,
    surfaceType: 'asphalt',
    trenchingRequired: true,
    boringRequired: true,
    trafficControlRequired: true,
    indoorOutdoor: 'outdoor',
    fireRatedPenetrations: false,
    accessRestrictions: 'Active retail center. Must maintain fire lanes and ADA access. Work after 9 PM only in front-of-store areas.',
  },
  charger: {
    brand: 'ChargePoint',
    model: 'CPF50',
    count: 4,
    pedestalCount: 2,
    portType: 'dual',
    mountType: 'pedestal',
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
    switchgearRequired: false,
    distanceToPanel_ft: 180,
    utilityCoordinationRequired: false,
    meterRoomRequired: null,
    junctionBoxCount: 2,
    disconnectRequired: null, electricalRoomDescription: 'Electrical room at back of anchor tenant space. Long run to front parking area requires 2 junction boxes.',
  },
  civil: {
    installationLocationDescription:
      '2 dual-port ChargePoint CPF50 pedestals (4 ports total) in front parking area near anchor store entrance. Trench from electrical room along building to front lot. Boring under sidewalk (~20 LF).',
  },
  permit: {
    responsibility: 'bullet',
    feeAllowance: 1500,
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
    bollardQty: 4,
    signQty: 4,
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
    taxRate: 8.25,
    contingencyPercent: 10,
    markupPercent: 20,
  },
  notes: 'Retail shopping center — 4 ChargePoint CPF50 dual pedestals. Long conduit run with boring under sidewalk. Cellular connectivity. ADA coordination required.',
};

// ── 11. Office Building Garage (like One Barton) ─────────────

const officeGarage: EstimateInput = {
  project: {
    name: 'One Barton Place - Garage EV Install',
    salesRep: 'Chris Taylor',
    projectType: 'full_turnkey',
    timeline: '8-12 weeks',
    isNewConstruction: false,
  },
  customer: {
    companyName: 'Barton Creek Management Group',
    contactName: 'Jennifer Walsh',
    contactEmail: 'jwalsh@bartoncreekgroup.com',
    contactPhone: '512-555-0813',
    billingAddress: '1501 Barton Springs Rd, Austin, TX 78704',
  },
  site: {
    address: '1501 Barton Springs Rd, Austin, TX 78704',
    siteType: 'office',
    state: 'TX',
  },
  parkingEnvironment: {
    type: 'parking_garage',
    hasPTSlab: true,
    slabScanRequired: true,
    coringRequired: true,
    surfaceType: 'concrete',
    trenchingRequired: false,
    boringRequired: false,
    trafficControlRequired: true,
    indoorOutdoor: 'indoor',
    fireRatedPenetrations: true,
    accessRestrictions: 'Office tenants M-F 7am-7pm. Construction work nights/weekends only. Maintain garage access during business hours.',
  },
  charger: {
    brand: 'Tesla',
    model: 'Universal Wall Connector',
    count: 6,
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
    availableCapacityKnown: true,
    availableAmps: 400,
    breakerSpaceAvailable: true,
    panelUpgradeRequired: false,
    transformerRequired: false,
    switchgearRequired: false,
    distanceToPanel_ft: 200,
    utilityCoordinationRequired: false,
    meterRoomRequired: null,
    junctionBoxCount: 3,
    disconnectRequired: null, electricalRoomDescription: 'Electrical room on B1. Chargers on P2. Route through 3 floors via existing conduit risers. 3 junction boxes.',
  },
  civil: {
    installationLocationDescription:
      '6 wall-mount Tesla UWC on P2 level against east wall. Conduit from B1 electrical room up through existing risers to P2. Surface-mount EMT on P2 ceiling and walls.',
  },
  permit: {
    responsibility: 'bullet',
    feeAllowance: 1800,
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
    bollardQty: 0,
    signQty: 6,
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
    taxRate: 8.25,
    contingencyPercent: 15,
    markupPercent: 25,
  },
  notes: 'Office garage install. 6 Tesla UWC wall-mount, P2 level. PT slab — slab scan and coring required. Long conduit run through 3 floors. Fire-rated penetrations. After-hours work only.',
};

// ── 12. Car Dealership - Service Call (like Cavender Buick) ──

const carDealershipService: EstimateInput = {
  project: {
    name: 'AutoNation Buick GMC - Service Call',
    salesRep: 'Alex Martinez',
    projectType: 'service_work',
    timeline: '1-2 days',
    isNewConstruction: false,
  },
  customer: {
    companyName: 'AutoNation Buick GMC San Antonio',
    contactName: 'Mark Henderson',
    contactEmail: 'mhenderson@autonation.com',
    contactPhone: '210-555-0945',
    billingAddress: '12300 San Pedro Ave, San Antonio, TX 78216',
  },
  site: {
    address: '12300 San Pedro Ave, San Antonio, TX 78216',
    siteType: 'fleet_dealer',
    state: 'TX',
  },
  parkingEnvironment: {
    type: 'surface_lot',
    hasPTSlab: false,
    slabScanRequired: false,
    coringRequired: false,
    surfaceType: 'concrete',
    trenchingRequired: false,
    boringRequired: false,
    trafficControlRequired: false,
    indoorOutdoor: 'outdoor',
    fireRatedPenetrations: false,
    accessRestrictions: 'Dealership lot. Work in designated service area only.',
  },
  charger: {
    brand: 'Tesla',
    model: 'Universal Wall Connector',
    count: 2,
    pedestalCount: 0,
    portType: 'single',
    mountType: 'wall',
    isCustomerSupplied: true,
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
    distanceToPanel_ft: 25,
    utilityCoordinationRequired: false,
    meterRoomRequired: null,
    junctionBoxCount: null,
    disconnectRequired: null, electricalRoomDescription: 'Panel in service bay adjacent to charger locations.',
  },
  civil: {
    installationLocationDescription:
      'Diagnostic/troubleshooting of 2 existing Tesla UWC that are not communicating. Check wiring, breakers, and network connectivity.',
  },
  permit: {
    responsibility: 'client',
    feeAllowance: null,
  },
  designEngineering: {
    responsibility: 'client',
    stampedPlansRequired: false,
  },
  network: {
    type: 'none',
    wifiInstallResponsibility: 'na',
  },
  accessories: {
    bollardQty: 0,
    signQty: 0,
    wheelStopQty: 0,
    stripingRequired: false,
    padRequired: false,
    debrisRemoval: false,
  },
  makeReady: {
    responsibility: 'client',
  },
  chargerInstall: {
    responsibility: 'bullet',
  },
  purchasingChargers: {
    responsibility: 'client',
  },
  signageBollards: {
    responsibility: 'none',
  },
  estimateControls: {
    pricingTier: 'msrp',
    taxRate: 8.25,
    contingencyPercent: 0,
    markupPercent: 20,
  },
  notes: 'Service call — troubleshoot 2 existing Tesla UWC at car dealership. Chargers not communicating. Check wiring, breakers, network. Customer-supplied chargers.',
};

// ── 13. Church/Community (like SW Islamic Center) ────────────

const churchCommunity: EstimateInput = {
  project: {
    name: 'Southwest Community Center - EV Charging',
    salesRep: 'Emily Rodriguez',
    projectType: 'full_turnkey',
    timeline: '4-6 weeks',
    isNewConstruction: false,
  },
  customer: {
    companyName: 'Southwest Community Association',
    contactName: 'Imam Rashid Ali',
    contactEmail: 'rali@swcommunity.org',
    contactPhone: '512-555-0356',
    billingAddress: '5110 Manor Rd, Austin, TX 78723',
  },
  site: {
    address: '5110 Manor Rd, Austin, TX 78723',
    siteType: 'other',
    state: 'TX',
  },
  parkingEnvironment: {
    type: 'surface_lot',
    hasPTSlab: false,
    slabScanRequired: false,
    coringRequired: false,
    surfaceType: 'asphalt',
    trenchingRequired: false,
    boringRequired: false,
    trafficControlRequired: false,
    indoorOutdoor: 'outdoor',
    fireRatedPenetrations: false,
    accessRestrictions: 'No work during Friday services (12pm-3pm) or Sunday events.',
  },
  charger: {
    brand: 'Tesla',
    model: 'Universal Wall Connector',
    count: 2,
    pedestalCount: 0,
    portType: 'single',
    mountType: 'wall',
    isCustomerSupplied: false,
    chargingLevel: 'l2',
    ampsPerCharger: 48,
    volts: 240,
  },
  electrical: {
    serviceType: '240v',
    availableCapacityKnown: true,
    availableAmps: 200,
    breakerSpaceAvailable: true,
    panelUpgradeRequired: false,
    transformerRequired: false,
    switchgearRequired: false,
    distanceToPanel_ft: 35,
    utilityCoordinationRequired: false,
    meterRoomRequired: null,
    junctionBoxCount: null,
    disconnectRequired: null, electricalRoomDescription: 'Main panel in utility room, adjacent to parking lot. Short run to exterior wall.',
  },
  civil: {
    installationLocationDescription:
      '2 Tesla UWC wall-mounted on exterior wall of community center facing parking lot. Short conduit run from interior panel through wall. No trenching needed.',
  },
  permit: {
    responsibility: 'bullet',
    feeAllowance: 400,
  },
  designEngineering: {
    responsibility: 'bullet',
    stampedPlansRequired: false,
  },
  network: {
    type: 'none',
    wifiInstallResponsibility: 'na',
  },
  accessories: {
    bollardQty: 2,
    signQty: 2,
    wheelStopQty: 2,
    stripingRequired: true,
    padRequired: false,
    debrisRemoval: false,
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
    taxRate: 8.25,
    contingencyPercent: 5,
    markupPercent: 15,
  },
  notes: 'Simple community center install. 2 Tesla UWC wall-mount, short run, no civil work. Schedule around worship services.',
};

// ── 14. Multi-Tenant Residential Garage (like Debut SoCo) ───

const multiTenantResidential: EstimateInput = {
  project: {
    name: 'Debut SoCo - Resident EV Garage Install',
    salesRep: 'Chris Taylor',
    projectType: 'full_turnkey',
    timeline: '10-14 weeks',
    isNewConstruction: false,
  },
  customer: {
    companyName: 'SoCo Living Partners',
    contactName: 'Rachel Kim',
    contactEmail: 'rkim@socoliving.com',
    contactPhone: '512-555-0174',
    billingAddress: '1800 S Congress Ave, Austin, TX 78704',
  },
  site: {
    address: '1800 S Congress Ave, Austin, TX 78704',
    siteType: 'apartment',
    state: 'TX',
  },
  parkingEnvironment: {
    type: 'parking_garage',
    hasPTSlab: true,
    slabScanRequired: true,
    coringRequired: true,
    surfaceType: 'concrete',
    trenchingRequired: false,
    boringRequired: false,
    trafficControlRequired: true,
    indoorOutdoor: 'indoor',
    fireRatedPenetrations: true,
    accessRestrictions: 'Active residential garage 24/7. Must maintain 90% parking access. Noise restrictions 10pm-7am. Elevator required for heavy equipment.',
  },
  charger: {
    brand: 'Tesla',
    model: 'Universal Wall Connector',
    count: 8,
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
    availableCapacityKnown: true,
    availableAmps: 400,
    breakerSpaceAvailable: true,
    panelUpgradeRequired: false,
    transformerRequired: false,
    switchgearRequired: false,
    distanceToPanel_ft: 250,
    utilityCoordinationRequired: false,
    meterRoomRequired: null,
    junctionBoxCount: 4,
    disconnectRequired: null, electricalRoomDescription: 'Main electrical room in B1. Chargers across P1 and P2 levels. Route through existing risers. 4 junction boxes needed for long runs.',
  },
  civil: {
    installationLocationDescription:
      '8 wall-mount Tesla UWC: 4 on P1 east wall, 4 on P2 east wall. Conduit from B1 electrical room up through existing risers. Surface-mount EMT along ceiling and down walls. PT slab — scan/core at each penetration point.',
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
    type: 'cellular_router',
    wifiInstallResponsibility: 'na',
  },
  accessories: {
    bollardQty: 0,
    signQty: 8,
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
    pricingTier: 'bulk_discount',
    taxRate: 8.25,
    contingencyPercent: 15,
    markupPercent: 22,
  },
  notes: 'Large multi-tenant residential garage. 8 Tesla UWC wall-mount across 2 garage levels. PT slab scanning/coring, fire-rated penetrations, long conduit runs. Phased installation to maintain resident access. Sub-metering required.',
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
  // ── New Scenarios from Real Proposals ──────────────────────
  {
    id: 'hotel-surface-lot',
    name: 'Hotel Surface Lot',
    description:
      '4x Tesla UWC pedestal, asphalt surface lot, standard hotel install with trenching.',
    input: hotelSurfaceLot,
  },
  {
    id: 'hilton-property',
    name: 'Hilton Property',
    description:
      '8x Tesla UWC pedestal, concrete lot, long conduit run with traffic control. Large hotel deployment.',
    input: hiltonProperty,
  },
  {
    id: 'luxury-apartments',
    name: 'Luxury Apartments',
    description:
      '4x Tesla UWC pedestal, mixed asphalt/concrete, boring under sidewalk. Upscale resident amenity.',
    input: luxuryApartments,
  },
  {
    id: 'medical-center',
    name: 'Medical Center Remove & Replace',
    description:
      '2x Tesla UWC wall-mount replacing old Blink units. Hospital campus, weekend-only work.',
    input: medicalCenter,
  },
  {
    id: 'vineyard-winery',
    name: 'Vineyard / Winery',
    description:
      '2x Tesla UWC pedestal, gravel lot, rural location. Soft-soil trenching, travel adder likely.',
    input: vineyardWinery,
  },
  {
    id: 'shopping-center',
    name: 'Shopping Center',
    description:
      '4x ChargePoint CPF50 dual pedestal (8 ports), asphalt lot, boring under sidewalk. Retail deployment.',
    input: shoppingCenter,
  },
  {
    id: 'office-garage',
    name: 'Office Building Garage',
    description:
      '6x Tesla UWC wall-mount, parking garage P2, PT slab, fire-rated penetrations. After-hours work only.',
    input: officeGarage,
  },
  {
    id: 'car-dealership-service',
    name: 'Car Dealership Service Call',
    description:
      'Service call — troubleshoot 2 non-communicating Tesla UWC at auto dealership.',
    input: carDealershipService,
  },
  {
    id: 'church-community',
    name: 'Church / Community Center',
    description:
      '2x Tesla UWC wall-mount, short run, no civil work. Simple community install.',
    input: churchCommunity,
  },
  {
    id: 'multi-tenant-residential',
    name: 'Multi-Tenant Residential Garage',
    description:
      '8x Tesla UWC wall-mount across 2 garage levels, PT slab, fire-rated penetrations, 250 ft conduit run.',
    input: multiTenantResidential,
  },
] as const;

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

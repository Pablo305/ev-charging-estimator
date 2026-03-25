import type { EstimateInput } from './types';

export function emptyInput(): EstimateInput {
  return {
    project: { name: '', salesRep: '', projectType: 'full_turnkey', timeline: '', isNewConstruction: null },
    customer: { companyName: '', contactName: '', contactEmail: '', contactPhone: '', billingAddress: '' },
    site: { address: '', siteType: null, state: '' },
    parkingEnvironment: {
      type: null, hasPTSlab: null, slabScanRequired: null, coringRequired: null,
      surfaceType: null, trenchingRequired: null, boringRequired: null,
      trafficControlRequired: null, indoorOutdoor: null, fireRatedPenetrations: null,
      accessRestrictions: '',
    },
    charger: {
      brand: '', model: '', count: 0, pedestalCount: 0, portType: null,
      mountType: null, isCustomerSupplied: false, chargingLevel: null,
      ampsPerCharger: null, volts: null,
    },
    electrical: {
      serviceType: null, availableCapacityKnown: false, availableAmps: null,
      breakerSpaceAvailable: null, panelUpgradeRequired: null, transformerRequired: null,
      switchgearRequired: null, distanceToPanel_ft: null, utilityCoordinationRequired: null,
      meterRoomRequired: null,
      junctionBoxCount: null,
      electricalRoomDescription: '',
    },
    civil: { installationLocationDescription: '' },
    permit: { responsibility: null, feeAllowance: null },
    designEngineering: { responsibility: null, stampedPlansRequired: null },
    network: { type: null, wifiInstallResponsibility: null },
    accessories: { bollardQty: 0, signQty: 0, wheelStopQty: 0, stripingRequired: false, padRequired: false, debrisRemoval: false },
    makeReady: { responsibility: null },
    chargerInstall: { responsibility: null },
    purchasingChargers: { responsibility: null },
    signageBollards: { responsibility: null },
    estimateControls: { pricingTier: 'msrp', taxRate: 7.0, contingencyPercent: 10, markupPercent: 20 },
    notes: '',
  };
}

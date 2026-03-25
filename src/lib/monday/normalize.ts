import { EstimateInput } from '../estimate/types';
import { BOARD_CONFIG } from './config';

// ============================================================
// monday.com Item Normalizer
// ============================================================
// Converts raw monday.com column_values into EstimateInput.

interface MondayColumnValue {
  id: string;
  value: string | null;
  text: string | null;
}

interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
}

function getCol(
  item: MondayItem,
  colId: string,
): MondayColumnValue | undefined {
  return item.column_values.find((cv) => cv.id === colId);
}

function getText(item: MondayItem, colId: string): string {
  return getCol(item, colId)?.text ?? '';
}

function getNumber(item: MondayItem, colId: string): number | null {
  const txt = getText(item, colId);
  if (!txt) return null;
  const n = parseFloat(txt);
  return isNaN(n) ? null : n;
}

function getBool(item: MondayItem, colId: string): boolean | null {
  const val = getCol(item, colId)?.value;
  if (val === null || val === undefined) return null;
  try {
    const parsed = JSON.parse(val);
    return parsed?.checked === 'true' || parsed?.checked === true;
  } catch {
    return null;
  }
}

function mapLabel(
  item: MondayItem,
  colId: string,
  labelMap: Record<string, string>,
  fallback: string | null = null,
): string | null {
  const text = getText(item, colId);
  if (!text) return fallback;
  const mapped = labelMap[text];
  return mapped ?? fallback;
}

// ── Main Normalizer ──────────────────────────────────────────

export function normalizeMondayItem(item: MondayItem): EstimateInput {
  const cols = BOARD_CONFIG.columnMappings;
  const labels = BOARD_CONFIG.labelMaps;

  return {
    project: {
      name: item.name || getText(item, cols.projectName),
      salesRep: getText(item, cols.salesRep),
      projectType:
        (mapLabel(item, cols.projectType, labels.projectType) as EstimateInput['project']['projectType']) ??
        'full_turnkey',
      timeline: getText(item, cols.timeline),
      isNewConstruction: getBool(item, cols.isNewConstruction),
    },
    customer: {
      companyName: getText(item, cols.companyName),
      contactName: getText(item, cols.contactName),
      contactEmail: getText(item, cols.contactEmail),
      contactPhone: getText(item, cols.contactPhone),
      billingAddress: getText(item, cols.billingAddress),
    },
    site: {
      address: getText(item, cols.siteAddress),
      siteType: mapLabel(item, cols.siteType, labels.siteType) as EstimateInput['site']['siteType'],
      state: getText(item, cols.state),
    },
    parkingEnvironment: {
      type: mapLabel(item, cols.parkingType, labels.parkingType) as EstimateInput['parkingEnvironment']['type'],
      hasPTSlab: getBool(item, cols.hasPTSlab),
      slabScanRequired: null, // No monday.com column mapped yet — requires board customization
      coringRequired: null, // No monday.com column mapped yet — requires board customization
      surfaceType: mapLabel(
        item,
        cols.surfaceType,
        labels.surfaceType,
      ) as EstimateInput['parkingEnvironment']['surfaceType'],
      trenchingRequired: getBool(item, cols.trenchingRequired),
      boringRequired: getBool(item, cols.boringRequired),
      trafficControlRequired: null, // No monday.com column mapped yet — requires board customization
      indoorOutdoor: mapLabel(
        item,
        cols.indoorOutdoor,
        { Indoor: 'indoor', Outdoor: 'outdoor', Both: 'both' },
      ) as EstimateInput['parkingEnvironment']['indoorOutdoor'],
      fireRatedPenetrations: null, // No monday.com column mapped yet — requires board customization
      accessRestrictions: '', // No monday.com column mapped yet — requires board customization
    },
    charger: {
      brand: getText(item, cols.chargerBrand),
      model: getText(item, cols.chargerModel),
      count: getNumber(item, cols.chargerCount) ?? 0,
      pedestalCount: getNumber(item, cols.pedestalCount) ?? 0,
      portType: mapLabel(
        item,
        cols.portType,
        { Single: 'single', Dual: 'dual', Mix: 'mix' },
      ) as EstimateInput['charger']['portType'],
      mountType: mapLabel(
        item,
        cols.mountType,
        { Pedestal: 'pedestal', Wall: 'wall', Mix: 'mix', Other: 'other' },
      ) as EstimateInput['charger']['mountType'],
      isCustomerSupplied: getBool(item, cols.customerSupplied) ?? false,
      chargingLevel: mapLabel(
        item,
        cols.chargingLevel,
        { 'Level 2': 'l2', 'L2': 'l2', 'Level 3 / DCFC': 'l3_dcfc', 'L3': 'l3_dcfc' },
      ) as EstimateInput['charger']['chargingLevel'],
      ampsPerCharger: getNumber(item, cols.ampsPerCharger),
      volts: getNumber(item, cols.volts),
    },
    electrical: {
      serviceType: mapLabel(
        item,
        cols.serviceType,
        labels.serviceType,
      ) as EstimateInput['electrical']['serviceType'],
      availableCapacityKnown: false, // No monday.com column mapped yet — requires board customization
      availableAmps: null, // No monday.com column mapped yet — requires board customization
      breakerSpaceAvailable: null, // No monday.com column mapped yet — requires board customization
      panelUpgradeRequired: getBool(item, cols.panelUpgrade),
      transformerRequired: getBool(item, cols.transformerRequired),
      switchgearRequired: null, // No monday.com column mapped yet — requires board customization
      distanceToPanel_ft: getNumber(item, cols.distanceToPanel),
      utilityCoordinationRequired: null, // No monday.com column mapped yet — requires board customization
      meterRoomRequired: null,
      junctionBoxCount: null,
      electricalRoomDescription: '', // No monday.com column mapped yet — requires board customization
    },
    civil: {
      installationLocationDescription: '', // No monday.com column mapped yet — requires board customization
    },
    permit: {
      responsibility: mapLabel(
        item,
        cols.permitResponsibility,
        labels.responsibility,
      ) as EstimateInput['permit']['responsibility'],
      feeAllowance: null, // No monday.com column mapped yet — requires board customization
    },
    designEngineering: {
      responsibility: mapLabel(
        item,
        cols.designResponsibility,
        labels.responsibility,
      ) as EstimateInput['designEngineering']['responsibility'],
      stampedPlansRequired: null, // No monday.com column mapped yet — requires board customization
    },
    network: {
      type: mapLabel(item, cols.networkType, labels.networkType) as EstimateInput['network']['type'],
      wifiInstallResponsibility: null, // No monday.com column mapped yet — requires board customization
    },
    accessories: {
      bollardQty: 0, // No monday.com column mapped yet — requires board customization
      signQty: 0, // No monday.com column mapped yet — requires board customization
      wheelStopQty: 0, // No monday.com column mapped yet — requires board customization
      stripingRequired: false, // No monday.com column mapped yet — requires board customization
      padRequired: false, // No monday.com column mapped yet — requires board customization
      debrisRemoval: false, // No monday.com column mapped yet — requires board customization
    },
    makeReady: {
      responsibility: mapLabel(
        item,
        cols.makeReadyResponsibility,
        labels.responsibility,
      ) as EstimateInput['makeReady']['responsibility'],
    },
    chargerInstall: {
      responsibility: mapLabel(
        item,
        cols.installResponsibility,
        labels.responsibility,
      ) as EstimateInput['chargerInstall']['responsibility'],
    },
    purchasingChargers: {
      responsibility: mapLabel(
        item,
        cols.purchasingResponsibility,
        labels.responsibility,
      ) as EstimateInput['purchasingChargers']['responsibility'],
    },
    signageBollards: {
      responsibility: null, // No monday.com column mapped yet — requires board customization
    },
    estimateControls: {
      pricingTier: 'msrp',
      taxRate: 7.0,
      contingencyPercent: 10,
      markupPercent: 20,
    },
    notes: getText(item, cols.notes),
  };
}

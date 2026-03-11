import { EstimateInput } from '../estimate/types';
import { BOARD_CONFIG } from './config';

// ============================================================
// monday.com Item Normalizer
// ============================================================
// Converts raw monday.com column_values into EstimateInput.

/* eslint-disable @typescript-eslint/no-explicit-any */

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

function mapLabel<T extends string>(
  item: MondayItem,
  colId: string,
  labelMap: Record<string, string>,
  fallback: T | null = null,
): T | null {
  const text = getText(item, colId);
  if (!text) return fallback;
  const mapped = labelMap[text];
  return (mapped as T) ?? fallback;
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
        (mapLabel(item, cols.projectType, labels.projectType) as any) ??
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
      siteType: mapLabel(item, cols.siteType, labels.siteType) as any,
      state: getText(item, cols.state),
    },
    parkingEnvironment: {
      type: mapLabel(item, cols.parkingType, labels.parkingType) as any,
      hasPTSlab: getBool(item, cols.hasPTSlab),
      slabScanRequired: null,
      coringRequired: null,
      surfaceType: mapLabel(
        item,
        cols.surfaceType,
        labels.surfaceType,
      ) as any,
      trenchingRequired: getBool(item, cols.trenchingRequired),
      boringRequired: getBool(item, cols.boringRequired),
      trafficControlRequired: null,
      indoorOutdoor: mapLabel(
        item,
        cols.indoorOutdoor,
        { Indoor: 'indoor', Outdoor: 'outdoor', Both: 'both' },
      ) as any,
      fireRatedPenetrations: null,
      accessRestrictions: '',
    },
    charger: {
      brand: getText(item, cols.chargerBrand),
      model: getText(item, cols.chargerModel),
      count: getNumber(item, cols.chargerCount) ?? 0,
      pedestalCount: getNumber(item, cols.pedestalCount) ?? 0,
      portType: null,
      mountType: mapLabel(
        item,
        cols.mountType,
        { Pedestal: 'pedestal', Wall: 'wall', Mix: 'mix', Other: 'other' },
      ) as any,
      isCustomerSupplied: getBool(item, cols.customerSupplied) ?? false,
      chargingLevel: mapLabel(
        item,
        cols.chargingLevel,
        { 'Level 2': 'l2', 'L2': 'l2', 'Level 3 / DCFC': 'l3_dcfc', 'L3': 'l3_dcfc' },
      ) as any,
      ampsPerCharger: getNumber(item, cols.ampsPerCharger),
      volts: getNumber(item, cols.volts),
    },
    electrical: {
      serviceType: mapLabel(
        item,
        cols.serviceType,
        labels.serviceType,
      ) as any,
      availableCapacityKnown: false,
      availableAmps: null,
      breakerSpaceAvailable: null,
      panelUpgradeRequired: getBool(item, cols.panelUpgrade),
      transformerRequired: getBool(item, cols.transformerRequired),
      switchgearRequired: null,
      distanceToPanel_ft: getNumber(item, cols.distanceToPanel),
      utilityCoordinationRequired: null,
      electricalRoomDescription: '',
    },
    civil: {
      installationLocationDescription: '',
    },
    permit: {
      responsibility: mapLabel(
        item,
        cols.permitResponsibility,
        labels.responsibility,
      ) as any,
      feeAllowance: null,
    },
    designEngineering: {
      responsibility: mapLabel(
        item,
        cols.designResponsibility,
        labels.responsibility,
      ) as any,
      stampedPlansRequired: null,
    },
    network: {
      type: mapLabel(item, cols.networkType, labels.networkType) as any,
      wifiInstallResponsibility: null,
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
      responsibility: mapLabel(
        item,
        cols.makeReadyResponsibility,
        labels.responsibility,
      ) as any,
    },
    chargerInstall: {
      responsibility: mapLabel(
        item,
        cols.installResponsibility,
        labels.responsibility,
      ) as any,
    },
    purchasingChargers: {
      responsibility: mapLabel(
        item,
        cols.purchasingResponsibility,
        labels.responsibility,
      ) as any,
    },
    signageBollards: {
      responsibility: null,
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

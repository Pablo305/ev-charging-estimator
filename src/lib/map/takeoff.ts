import type { EstimateInput } from '@/lib/estimate/types';
import { emptyInput } from '@/lib/estimate/emptyInput';
import type { MapWorkspaceState, EstimatePatch } from './types';
import { generatePatches, applyPatches } from './sync';

type MapWorkspaceInput = NonNullable<EstimateInput['mapWorkspace']>;
export type StoredDrawings = NonNullable<MapWorkspaceInput['drawings']>;

export interface TakeoffDraft {
  siteAddress: string;
  siteState: string;
  siteCoordinates: [number, number] | null;
  drawings: StoredDrawings;
}

const US_STATE_CODES: Record<string, string> = {
  ALABAMA: 'AL',
  ALASKA: 'AK',
  ARIZONA: 'AZ',
  ARKANSAS: 'AR',
  CALIFORNIA: 'CA',
  COLORADO: 'CO',
  CONNECTICUT: 'CT',
  DELAWARE: 'DE',
  FLORIDA: 'FL',
  GEORGIA: 'GA',
  HAWAII: 'HI',
  IDAHO: 'ID',
  ILLINOIS: 'IL',
  INDIANA: 'IN',
  IOWA: 'IA',
  KANSAS: 'KS',
  KENTUCKY: 'KY',
  LOUISIANA: 'LA',
  MAINE: 'ME',
  MARYLAND: 'MD',
  MASSACHUSETTS: 'MA',
  MICHIGAN: 'MI',
  MINNESOTA: 'MN',
  MISSISSIPPI: 'MS',
  MISSOURI: 'MO',
  MONTANA: 'MT',
  NEBRASKA: 'NE',
  NEVADA: 'NV',
  'NEW HAMPSHIRE': 'NH',
  'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM',
  'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC',
  'NORTH DAKOTA': 'ND',
  OHIO: 'OH',
  OKLAHOMA: 'OK',
  OREGON: 'OR',
  PENNSYLVANIA: 'PA',
  'RHODE ISLAND': 'RI',
  'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD',
  TENNESSEE: 'TN',
  TEXAS: 'TX',
  UTAH: 'UT',
  VERMONT: 'VT',
  VIRGINIA: 'VA',
  WASHINGTON: 'WA',
  'WEST VIRGINIA': 'WV',
  WISCONSIN: 'WI',
  WYOMING: 'WY',
  'DISTRICT OF COLUMBIA': 'DC',
};

export function emptyStoredDrawings(): StoredDrawings {
  return {
    runs: [],
    equipment: [],
  };
}

export function extractStateFromAddress(address: string): string {
  const upperAddress = address.toUpperCase();
  const directMatch = upperAddress.match(/,\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?(?:,|$)/);
  if (directMatch) return directMatch[1];

  const parts = upperAddress.split(',').map((part) => part.trim());
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const stateZipMatch = parts[index].match(/^([A-Z]{2})\s+\d{5}(?:-\d{4})?$/);
    if (stateZipMatch) return stateZipMatch[1];

    const normalized = parts[index].replace(/\s+\d{5}(?:-\d{4})?$/, '').trim();
    if (US_STATE_CODES[normalized]) return US_STATE_CODES[normalized];
  }

  return '';
}

export function serializeMapDrawings(
  mapState: Pick<MapWorkspaceState, 'runs' | 'equipment'>,
): StoredDrawings {
  return {
    runs: mapState.runs.map((run) => ({
      id: run.id,
      runType: run.runType,
      geometry: run.geometry,
      lengthFt: run.lengthFt,
      label: run.label,
      createdAt: run.createdAt,
    })),
    equipment: mapState.equipment.map((equipment) => ({
      id: equipment.id,
      equipmentType: equipment.equipmentType,
      geometry: equipment.geometry,
      label: equipment.label,
    })),
  };
}

export function createTakeoffDraftFromEstimate(input: EstimateInput): TakeoffDraft | null {
  const drawings = input.mapWorkspace?.drawings ?? emptyStoredDrawings();
  const hasAddress = input.site.address.trim().length > 0;
  const hasCoords = Array.isArray(input.mapWorkspace?.siteCoordinates);
  const hasDrawings = drawings.runs.length > 0 || drawings.equipment.length > 0;

  if (!hasAddress && !hasCoords && !hasDrawings) return null;

  return {
    siteAddress: input.site.address,
    siteState: input.site.state,
    siteCoordinates: input.mapWorkspace?.siteCoordinates ?? null,
    drawings,
  };
}

export function createStandaloneTakeoffSnapshot(
  baseInput: EstimateInput,
  mapState: MapWorkspaceState,
  options?: { siteAddress?: string; siteState?: string },
): EstimateInput {
  const defaults = emptyInput();
  const nextAddress = options?.siteAddress?.trim() ?? mapState.siteAddress ?? baseInput.site.address;
  const nextState = options?.siteState?.trim().toUpperCase()
    || extractStateFromAddress(nextAddress)
    || baseInput.site.state;
  const panelCount = countEquipment(mapState, ['panel']) ?? 0;

  return {
    ...baseInput,
    site: {
      ...baseInput.site,
      address: nextAddress,
      state: nextState,
    },
    mapWorkspace: {
      ...(defaults.mapWorkspace ?? {}),
      ...(baseInput.mapWorkspace ?? {}),
      conduitDistance_ft: sumRunLength(mapState, 'conduit'),
      feederDistance_ft: sumRunLength(mapState, 'feeder'),
      trenchingDistance_ft: sumRunLength(mapState, 'trench'),
      boringDistance_ft: sumRunLength(mapState, 'bore'),
      concreteCuttingDistance_ft: sumRunLength(mapState, 'concrete_cut'),
      chargerCountFromMap: countEquipment(mapState, ['charger_l2', 'charger_l3']),
      siteCoordinates: mapState.siteCoordinates,
      pvcConduitDistance_ft: sumRunLength(mapState, 'pvc_conduit'),
      cableTrayDistance_ft: sumRunLength(mapState, 'cable_tray'),
      concretePadCount: countEquipment(mapState, ['concrete_pad']),
      hasPanelPlaced: panelCount > 0 ? true : null,
      lightingCount: countEquipment(mapState, ['lighting']),
      drawings: serializeMapDrawings(mapState),
    },
  };
}

export function createEstimateInputFromTakeoff(
  mapState: MapWorkspaceState,
  baseInput: EstimateInput,
  options?: { siteAddress?: string; siteState?: string },
): EstimateInput {
  const seededInput = createStandaloneTakeoffSnapshot(baseInput, mapState, options);
  const acceptedPatches: EstimatePatch[] = generatePatches(mapState, seededInput).patches.map((patch) => ({
    ...patch,
    status: 'accepted',
  }));

  return applyPatches(seededInput, acceptedPatches);
}

function sumRunLength(
  mapState: MapWorkspaceState,
  runType: MapWorkspaceState['runs'][number]['runType'],
): number | null {
  const total = mapState.runs
    .filter((run) => run.runType === runType)
    .reduce((sum, run) => sum + run.lengthFt, 0);

  return total > 0 ? Math.round(total * 100) / 100 : null;
}

function countEquipment(
  mapState: MapWorkspaceState,
  equipmentTypes: readonly MapWorkspaceState['equipment'][number]['equipmentType'][],
): number | null {
  const total = mapState.equipment.filter((equipment) => equipmentTypes.includes(equipment.equipmentType)).length;
  return total > 0 ? total : null;
}

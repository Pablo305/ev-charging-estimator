// ============================================================
// Map workspace reducer (shared by MapWorkspace + readonly viewer)
// ============================================================

import type { MapAction, MapWorkspaceState } from '@/lib/map/types';

export function initialMapState(): MapWorkspaceState {
  return {
    siteAddress: '',
    siteCoordinates: null,
    runs: [],
    equipment: [],
    selectedTool: null,
    selectedFeatureId: null,
    powerSourceLocation: null,
    chargerZones: [],
  };
}

export function mapReducer(state: MapWorkspaceState, action: MapAction): MapWorkspaceState {
  switch (action.type) {
    case 'SET_ADDRESS':
      return {
        ...state,
        siteAddress: action.address,
        siteCoordinates: action.coordinates,
        powerSourceLocation: null,
        chargerZones: [],
      };

    case 'SELECT_TOOL':
      return { ...state, selectedTool: action.tool, selectedFeatureId: null };

    case 'SELECT_FEATURE':
      return { ...state, selectedFeatureId: action.featureId };

    case 'ADD_RUN':
      return { ...state, runs: [...state.runs, action.run] };

    case 'UPDATE_RUN':
      return {
        ...state,
        runs: state.runs.map((r) =>
          r.id === action.id ? { ...r, geometry: action.geometry, lengthFt: action.lengthFt } : r,
        ),
      };

    case 'DELETE_RUN':
      return {
        ...state,
        runs: state.runs.filter((r) => r.id !== action.id),
        selectedFeatureId: state.selectedFeatureId === action.id ? null : state.selectedFeatureId,
      };

    case 'ADD_EQUIPMENT':
      return { ...state, equipment: [...state.equipment, action.equipment] };

    case 'UPDATE_EQUIPMENT':
      return {
        ...state,
        equipment: state.equipment.map((e) =>
          e.id === action.id ? { ...e, geometry: action.geometry } : e,
        ),
      };

    case 'DELETE_EQUIPMENT':
      return {
        ...state,
        equipment: state.equipment.filter((e) => e.id !== action.id),
        selectedFeatureId: state.selectedFeatureId === action.id ? null : state.selectedFeatureId,
      };

    case 'SET_POWER_SOURCE':
      return { ...state, powerSourceLocation: action.coordinates };

    case 'SET_CHARGER_ZONE':
      return { ...state, chargerZones: [...state.chargerZones, action.coordinates] };

    case 'LOAD_AI_RUNS': {
      const manualRuns = state.runs.filter((r) => !r.id.includes('-auto-'));
      const manualEquipment = state.equipment.filter((e) => !e.id.includes('-auto-'));
      return {
        ...state,
        runs: [...manualRuns, ...action.runs],
        equipment: [...manualEquipment, ...action.equipment],
      };
    }

    case 'RESET':
      return initialMapState();

    default:
      return state;
  }
}

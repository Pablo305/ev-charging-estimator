// ============================================================
// Map Workspace Types
// ============================================================

import type { LineString, Point } from 'geojson';

export type RunType = 'conduit' | 'feeder' | 'trench' | 'bore' | 'concrete_cut';

export type EquipmentType =
  | 'charger_l2'
  | 'charger_l3'
  | 'transformer'
  | 'switchgear'
  | 'utility_meter'
  | 'meter_room'
  | 'junction_box'
  | 'bollard';

export interface RunSegment {
  readonly id: string;
  readonly runType: RunType;
  readonly geometry: LineString;
  readonly lengthFt: number;
  readonly label: string;
  readonly createdAt: string;
}

export interface EquipmentPlacement {
  readonly id: string;
  readonly equipmentType: EquipmentType;
  readonly geometry: Point;
  readonly label: string;
  readonly properties: Record<string, unknown>;
}

export type PointToolType = 'power_source' | 'charger_zone';

export interface MapWorkspaceState {
  readonly siteAddress: string;
  readonly siteCoordinates: [number, number] | null;
  readonly runs: readonly RunSegment[];
  readonly equipment: readonly EquipmentPlacement[];
  readonly selectedTool: RunType | EquipmentType | PointToolType | null;
  readonly selectedFeatureId: string | null;
  readonly powerSourceLocation: [number, number] | null;
  readonly chargerZones: readonly [number, number][];
}

export type PatchStatus = 'pending' | 'accepted' | 'rejected';

export interface EstimatePatch {
  readonly id: string;
  readonly fieldPath: string;
  readonly previousValue: unknown;
  readonly proposedValue: unknown;
  readonly source: 'map_measurement' | 'map_equipment' | 'auto_infer' | 'ai_analysis';
  readonly reason: string;
  readonly status: PatchStatus;
  /** True when the patch was auto-accepted because the target field was empty */
  readonly autoAccepted?: boolean;
}

export interface PatchBatch {
  readonly batchId: string;
  readonly trigger: string;
  readonly patches: readonly EstimatePatch[];
  readonly createdAt: string;
}

// ── Reducer actions ──

export type MapAction =
  | { type: 'SET_ADDRESS'; address: string; coordinates: [number, number] }
  | { type: 'SELECT_TOOL'; tool: RunType | EquipmentType | PointToolType | null }
  | { type: 'SELECT_FEATURE'; featureId: string | null }
  | { type: 'ADD_RUN'; run: RunSegment }
  | { type: 'UPDATE_RUN'; id: string; geometry: LineString; lengthFt: number }
  | { type: 'DELETE_RUN'; id: string }
  | { type: 'ADD_EQUIPMENT'; equipment: EquipmentPlacement }
  | { type: 'UPDATE_EQUIPMENT'; id: string; geometry: Point }
  | { type: 'DELETE_EQUIPMENT'; id: string }
  | { type: 'SET_POWER_SOURCE'; coordinates: [number, number] }
  | { type: 'SET_CHARGER_ZONE'; coordinates: [number, number] }
  | { type: 'LOAD_AI_RUNS'; runs: readonly RunSegment[]; equipment: readonly EquipmentPlacement[] }
  | { type: 'RESET' };

// ── Aggregation types ──

export type AggregationType = 'SUM' | 'COUNT' | 'BOOLEAN';

export interface FieldMapping {
  readonly runType?: RunType;
  readonly equipmentType?: EquipmentType;
  readonly fieldPath: string;
  readonly aggregation: AggregationType;
  readonly cap?: number;
  readonly capWarning?: string;
}

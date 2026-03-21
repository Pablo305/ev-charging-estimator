// ============================================================
// Map Workspace Constants & Field Mappings
// ============================================================

import type { RunType, EquipmentType, FieldMapping } from './types';

// ── Run type visual config ──

export interface RunTypeConfig {
  readonly label: string;
  readonly color: string;
  readonly shortcut: string;
  readonly description: string;
}

export const RUN_TYPE_CONFIG: Record<RunType, RunTypeConfig> = {
  conduit: {
    label: 'Conduit',
    color: '#2563EB',
    shortcut: 'C',
    description: 'EMT conduit from panel to charger',
  },
  trench: {
    label: 'Trench',
    color: '#D97706',
    shortcut: 'T',
    description: 'Open trench in soft soil',
  },
  bore: {
    label: 'Bore',
    color: '#7C3AED',
    shortcut: 'B',
    description: 'Directional boring under hard surface',
  },
  concrete_cut: {
    label: 'Concrete Cut',
    color: '#DC2626',
    shortcut: 'X',
    description: 'Saw-cutting through concrete slab',
  },
  feeder: {
    label: 'Feeder',
    color: '#059669',
    shortcut: 'F',
    description: 'Feeder cable run from utility/transformer',
  },
} as const;

// ── Equipment type visual config ──

export interface EquipmentTypeConfig {
  readonly label: string;
  readonly icon: string;
  readonly shortcut: string;
}

export const EQUIPMENT_TYPE_CONFIG: Record<EquipmentType, EquipmentTypeConfig> = {
  charger_l2: { label: 'L2 Charger', icon: '⚡', shortcut: '2' },
  charger_l3: { label: 'L3 DCFC', icon: '⚡⚡', shortcut: '3' },
  transformer: { label: 'Transformer', icon: '🔌', shortcut: 'R' },
  switchgear: { label: 'Switchgear', icon: '🔲', shortcut: 'G' },
  utility_meter: { label: 'Utility Meter', icon: '📊', shortcut: 'M' },
} as const;

// ── Field mappings: map features → EstimateInput fields ──

export const FIELD_MAPPINGS: readonly FieldMapping[] = [
  // Line runs → distance fields
  {
    runType: 'conduit',
    fieldPath: 'mapWorkspace.conduitDistance_ft',
    aggregation: 'SUM',
  },
  {
    runType: 'feeder',
    fieldPath: 'mapWorkspace.feederDistance_ft',
    aggregation: 'SUM',
  },
  {
    runType: 'trench',
    fieldPath: 'mapWorkspace.trenchingDistance_ft',
    aggregation: 'SUM',
  },
  {
    runType: 'bore',
    fieldPath: 'mapWorkspace.boringDistance_ft',
    aggregation: 'SUM',
    cap: 50,
    capWarning: 'Boring capped at 50ft. Consider splitting into bore + trench segments.',
  },
  {
    runType: 'concrete_cut',
    fieldPath: 'mapWorkspace.concreteCuttingDistance_ft',
    aggregation: 'SUM',
    cap: 100,
    capWarning: 'Concrete cutting capped at 100ft per industry standard.',
  },

  // Equipment → count/boolean fields
  {
    equipmentType: 'charger_l2',
    fieldPath: 'mapWorkspace.chargerCountFromMap',
    aggregation: 'COUNT',
  },
  {
    equipmentType: 'charger_l3',
    fieldPath: 'mapWorkspace.chargerCountFromMap',
    aggregation: 'COUNT',
  },
  {
    equipmentType: 'charger_l2',
    fieldPath: 'charger.count',
    aggregation: 'COUNT',
  },
  {
    equipmentType: 'charger_l3',
    fieldPath: 'charger.count',
    aggregation: 'COUNT',
  },
  {
    equipmentType: 'transformer',
    fieldPath: 'electrical.transformerRequired',
    aggregation: 'BOOLEAN',
  },
  {
    equipmentType: 'switchgear',
    fieldPath: 'electrical.switchgearRequired',
    aggregation: 'BOOLEAN',
  },
  {
    equipmentType: 'utility_meter',
    fieldPath: 'electrical.utilityCoordinationRequired',
    aggregation: 'BOOLEAN',
  },
] as const;

// ── Routing factor for straight-line → conduit distance ──

export const CONDUIT_ROUTING_FACTOR = 1.3;

// ── Debounce delay for patch generation (ms) ──

export const PATCH_DEBOUNCE_MS = 300;

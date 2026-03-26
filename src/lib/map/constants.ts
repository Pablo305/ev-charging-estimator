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
  readonly dashArray?: readonly number[];
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
  pvc_conduit: {
    label: 'PVC Conduit',
    color: '#0EA5E9',
    shortcut: 'V',
    description: 'PVC conduit pathway',
    dashArray: [8, 4],
  },
  cable_tray: {
    label: 'Cable Tray',
    color: '#64748B',
    shortcut: 'Y',
    description: 'Overhead or surface cable tray',
    dashArray: [12, 6],
  },
} as const;

// ── Equipment type visual config ──

export interface EquipmentTypeConfig {
  readonly label: string;
  readonly icon: string;
  readonly shortcut: string;
  readonly color?: string;
}

export const EQUIPMENT_TYPE_CONFIG: Record<EquipmentType, EquipmentTypeConfig> = {
  charger_l2: { label: 'L2 Charger', icon: 'l2', shortcut: '2' },
  charger_l3: { label: 'L3 DCFC', icon: 'l3', shortcut: '3' },
  transformer: { label: 'Transformer', icon: 'transformer', shortcut: 'R' },
  switchgear: { label: 'Switchgear', icon: 'switchgear', shortcut: 'G' },
  utility_meter: { label: 'Utility Meter', icon: 'meter', shortcut: 'U' },
  meter_room: { label: 'Meter Room', icon: 'meter_room', shortcut: 'M' },
  junction_box: { label: 'Junction Box', icon: 'junction', shortcut: 'J' },
  bollard: { label: 'Bollard', icon: 'bollard', shortcut: 'O' },
  panel: { label: 'Electrical Panel', icon: 'panel', shortcut: 'P', color: '#2563EB' },
  disconnect: { label: 'Disconnect Switch', icon: 'disconnect', shortcut: 'D', color: '#6366F1' },
  concrete_pad: { label: 'Concrete Pad', icon: 'pad', shortcut: 'A', color: '#78716C' },
  ev_sign: { label: 'EV Sign', icon: 'sign', shortcut: 'S', color: '#22C55E' },
  wheel_stop: { label: 'Wheel Stop', icon: 'wheelstop', shortcut: 'W', color: '#A3A3A3' },
  lighting: { label: 'Parking Light', icon: 'light', shortcut: 'L', color: '#EAB308' },
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
  {
    equipmentType: 'meter_room',
    fieldPath: 'electrical.meterRoomRequired',
    aggregation: 'BOOLEAN',
  },
  {
    equipmentType: 'junction_box',
    fieldPath: 'electrical.junctionBoxCount',
    aggregation: 'COUNT',
  },
  {
    equipmentType: 'bollard',
    fieldPath: 'accessories.bollardQty',
    aggregation: 'COUNT',
  },

  // New run type field mappings
  {
    runType: 'pvc_conduit',
    fieldPath: 'mapWorkspace.pvcConduitDistance_ft',
    aggregation: 'SUM',
  },
  {
    runType: 'cable_tray',
    fieldPath: 'mapWorkspace.cableTrayDistance_ft',
    aggregation: 'SUM',
  },

  // New equipment field mappings
  {
    equipmentType: 'ev_sign',
    fieldPath: 'accessories.signQty',
    aggregation: 'COUNT',
  },
  {
    equipmentType: 'wheel_stop',
    fieldPath: 'accessories.wheelStopQty',
    aggregation: 'COUNT',
  },
  {
    equipmentType: 'concrete_pad',
    fieldPath: 'mapWorkspace.concretePadCount',
    aggregation: 'COUNT',
  },
  {
    equipmentType: 'panel',
    fieldPath: 'mapWorkspace.hasPanelPlaced',
    aggregation: 'BOOLEAN',
  },
  {
    equipmentType: 'lighting',
    fieldPath: 'mapWorkspace.lightingCount',
    aggregation: 'COUNT',
  },
  {
    equipmentType: 'disconnect',
    fieldPath: 'electrical.disconnectRequired',
    aggregation: 'BOOLEAN',
  },
] as const;

// ── Routing factor for straight-line → conduit distance ──

export const CONDUIT_ROUTING_FACTOR = 1.3;

// ── Debounce delay for patch generation (ms) ──

export const PATCH_DEBOUNCE_MS = 300;

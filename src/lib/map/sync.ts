// ============================================================
// Map → Estimate Sync: Patch Generation & Application
// ============================================================

import type { EstimateInput } from '@/lib/estimate/types';
import type {
  MapWorkspaceState,
  EstimatePatch,
  PatchBatch,
  FieldMapping,
} from './types';
import { FIELD_MAPPINGS } from './constants';
import { sumRunsByType, countEquipmentByType } from './measurements';

// ── Deep get/set helpers ──

const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function deepGet(obj: unknown, path: string): unknown {
  const parts = path.split('.');

  // Block prototype pollution vectors (consistent with deepSet)
  if (parts.some((p) => BLOCKED_KEYS.has(p))) return undefined;

  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function deepSet(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.');

  // Block prototype pollution vectors
  if (parts.some((p) => BLOCKED_KEYS.has(p))) return obj;

  if (parts.length === 1) {
    return { ...obj, [parts[0]]: value };
  }

  const [head, ...rest] = parts;
  const child = (obj[head] ?? {}) as Record<string, unknown>;
  return {
    ...obj,
    [head]: deepSet({ ...child }, rest.join('.'), value),
  };
}

// ── Aggregate a single field mapping from map state ──

function aggregateMapping(
  mapping: FieldMapping,
  mapState: MapWorkspaceState,
): unknown {
  if (mapping.runType !== undefined) {
    const total = sumRunsByType(mapState.runs, mapping.runType);
    if (total === 0) return null;
    if (mapping.cap !== undefined) {
      return Math.min(total, mapping.cap);
    }
    return Math.round(total * 100) / 100;
  }

  if (mapping.equipmentType !== undefined) {
    // Special case: charger types aggregate together
    if (
      mapping.equipmentType === 'charger_l2' ||
      mapping.equipmentType === 'charger_l3'
    ) {
      const count = countEquipmentByType(
        mapState.equipment,
        ['charger_l2', 'charger_l3'],
      );
      return count > 0 ? count : null;
    }

    if (mapping.aggregation === 'BOOLEAN') {
      const count = countEquipmentByType(mapState.equipment, mapping.equipmentType);
      return count > 0 ? true : null;
    }

    const count = countEquipmentByType(mapState.equipment, mapping.equipmentType);
    return count > 0 ? count : null;
  }

  return null;
}

// ── Generate patches by comparing map state to current input ──

export function generatePatches(
  mapState: MapWorkspaceState,
  currentInput: EstimateInput,
): PatchBatch {
  const patches: EstimatePatch[] = [];
  const seen = new Set<string>();
  let patchCounter = 0;

  for (const mapping of FIELD_MAPPINGS) {
    // Skip duplicate field paths (e.g., charger_l2 and charger_l3 both map to chargerCountFromMap)
    if (seen.has(mapping.fieldPath)) continue;
    seen.add(mapping.fieldPath);

    const proposedValue = aggregateMapping(mapping, mapState);
    const currentValue = deepGet(currentInput, mapping.fieldPath);

    // Only generate patch when values differ
    if (proposedValue === currentValue) continue;
    if (proposedValue === null && currentValue === undefined) continue;

    // Auto-accept only distance measurements into empty fields.
    // Equipment booleans/counts require explicit user review.
    const previousEmpty = currentValue == null;
    const isRunMeasurement = mapping.runType !== undefined;
    const autoAcceptable = previousEmpty && isRunMeasurement;

    patchCounter += 1;
    const patch: EstimatePatch = {
      id: `patch-${String(patchCounter).padStart(4, '0')}`,
      fieldPath: mapping.fieldPath,
      previousValue: currentValue ?? null,
      proposedValue,
      source: isRunMeasurement ? 'map_measurement' : 'map_equipment',
      reason: buildPatchReason(mapping, proposedValue),
      status: autoAcceptable ? 'accepted' : 'pending',
      autoAccepted: autoAcceptable,
    };

    patches.push(patch);
  }

  // Add site coordinates patch if available and different from current
  const currentCoords = deepGet(currentInput, 'mapWorkspace.siteCoordinates');
  const coordsMatch = Array.isArray(currentCoords) && Array.isArray(mapState.siteCoordinates)
    && currentCoords[0] === mapState.siteCoordinates[0]
    && currentCoords[1] === mapState.siteCoordinates[1];
  if (mapState.siteCoordinates != null && !coordsMatch) {
    const coordsEmpty = currentCoords == null;
    patchCounter += 1;
    patches.push({
      id: `patch-${String(patchCounter).padStart(4, '0')}`,
      fieldPath: 'mapWorkspace.siteCoordinates',
      previousValue: currentCoords ?? null,
      proposedValue: mapState.siteCoordinates,
      source: 'map_measurement',
      reason: 'Site coordinates from map address search',
      status: coordsEmpty ? 'accepted' : 'pending',
      autoAccepted: coordsEmpty,
    });
  }

  return {
    batchId: `batch-${Date.now()}`,
    trigger: 'map_state_change',
    patches,
    createdAt: new Date().toISOString(),
  };
}

// ── Apply accepted patches immutably ──

export function applyPatches(
  input: EstimateInput,
  patches: readonly EstimatePatch[],
): EstimateInput {
  const accepted = patches.filter((p) => p.status === 'accepted');
  if (accepted.length === 0) return input;

  let result = { ...input } as Record<string, unknown>;
  for (const patch of accepted) {
    result = deepSet(result, patch.fieldPath, patch.proposedValue);
  }
  return result as unknown as EstimateInput;
}

// ── Build human-readable reason string ──

function buildPatchReason(mapping: FieldMapping, value: unknown): string {
  if (mapping.runType !== undefined) {
    const label = mapping.runType.replace(/_/g, ' ');
    const ft = typeof value === 'number' ? `${value} ft` : 'removed';
    const capped =
      mapping.cap !== undefined && typeof value === 'number' && value >= mapping.cap
        ? ` (capped at ${mapping.cap}ft)`
        : '';
    return `${label} distance from map: ${ft}${capped}`;
  }

  if (mapping.equipmentType !== undefined) {
    if (mapping.aggregation === 'BOOLEAN') {
      return value === true
        ? `${mapping.equipmentType} placed on map`
        : `${mapping.equipmentType} removed from map`;
    }
    return `${mapping.equipmentType} count from map: ${value ?? 0}`;
  }

  return 'Updated from map workspace';
}

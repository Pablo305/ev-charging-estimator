// ============================================================
// Contradiction Detection — Real-time validation
// ============================================================

import type { EstimateInput } from '@/lib/estimate/types';
import type { MapWorkspaceState } from './types';

export interface Contradiction {
  readonly id: string;
  readonly severity: 'error' | 'warning';
  readonly field: string;
  readonly message: string;
  readonly featureId?: string;
}

/**
 * Check for impossible or contradictory combinations
 * between map state and estimate input.
 */
export function detectContradictions(
  input: EstimateInput,
  mapState: MapWorkspaceState,
): Contradiction[] {
  const contradictions: Contradiction[] = [];
  let id = 0;
  const next = () => `contradiction-${++id}`;

  // L3 charger placed but service is low voltage
  const hasL3OnMap = mapState.equipment.some(
    (e) => e.equipmentType === 'charger_l3',
  );
  if (
    hasL3OnMap &&
    input.electrical.serviceType !== null &&
    input.electrical.serviceType !== '480v_3phase' &&
    input.electrical.serviceType !== 'unknown'
  ) {
    contradictions.push({
      id: next(),
      severity: 'error',
      field: 'electrical.serviceType',
      message: `L3 DCFC requires 480V 3-phase. Current service is ${input.electrical.serviceType} — upgrade needed.`,
    });
  }

  // Wall mount charger in surface lot with no building
  if (
    input.charger.mountType === 'wall' &&
    input.parkingEnvironment.type === 'surface_lot'
  ) {
    contradictions.push({
      id: next(),
      severity: 'warning',
      field: 'charger.mountType',
      message: 'Wall mount selected but parking type is surface lot. Ensure a wall/structure is available at the charger location.',
    });
  }

  // Surface lot with post-tensioned slab
  if (
    input.parkingEnvironment.type === 'surface_lot' &&
    input.parkingEnvironment.hasPTSlab === true
  ) {
    contradictions.push({
      id: next(),
      severity: 'error',
      field: 'parkingEnvironment.hasPTSlab',
      message: 'Post-tensioned slabs exist in garages, not surface lots. Verify parking environment type.',
    });
  }

  // Bore distance over cap
  const boreRuns = mapState.runs.filter((r) => r.runType === 'bore');
  for (const run of boreRuns) {
    if (run.lengthFt > 50) {
      contradictions.push({
        id: next(),
        severity: 'warning',
        field: 'mapWorkspace.boringDistance_ft',
        message: `Bore segment "${run.label}" is ${Math.round(run.lengthFt)}ft — boring is capped at 50ft. Consider splitting into bore + trench segments.`,
        featureId: run.id,
      });
    }
  }

  // Concrete cut distance over cap
  const cutRuns = mapState.runs.filter((r) => r.runType === 'concrete_cut');
  for (const run of cutRuns) {
    if (run.lengthFt > 100) {
      contradictions.push({
        id: next(),
        severity: 'warning',
        field: 'mapWorkspace.concreteCuttingDistance_ft',
        message: `Concrete cut segment "${run.label}" is ${Math.round(run.lengthFt)}ft — cutting is capped at 100ft per industry standard.`,
        featureId: run.id,
      });
    }
  }

  // No transformer but many L3 chargers
  const l3Count = mapState.equipment.filter(
    (e) => e.equipmentType === 'charger_l3',
  ).length;
  if (l3Count >= 4 && input.electrical.transformerRequired !== true) {
    const hasTransformerOnMap = mapState.equipment.some(
      (e) => e.equipmentType === 'transformer',
    );
    if (!hasTransformerOnMap) {
      contradictions.push({
        id: next(),
        severity: 'warning',
        field: 'electrical.transformerRequired',
        message: `${l3Count} L3 DCFC chargers placed but no transformer on map or in form. A transformer is likely needed.`,
      });
    }
  }

  // Map conduit distance vs form panel distance — large mismatch
  const conduitFt = mapState.runs
    .filter((r) => r.runType === 'conduit')
    .reduce((sum, r) => sum + r.lengthFt, 0);
  if (conduitFt > 0 && input.electrical.distanceToPanel_ft != null) {
    const diff = Math.abs(conduitFt - input.electrical.distanceToPanel_ft);
    if (diff > 50) {
      contradictions.push({
        id: next(),
        severity: 'warning',
        field: 'electrical.distanceToPanel_ft',
        message: `Map conduit runs total ${Math.round(conduitFt)}ft but the form says ${input.electrical.distanceToPanel_ft}ft to panel. Map measurement is used for pricing.`,
      });
    }
  }

  // Charger count mismatch between map and form
  const mapChargerCount = mapState.equipment.filter(
    (e) => e.equipmentType === 'charger_l2' || e.equipmentType === 'charger_l3',
  ).length;
  if (mapChargerCount > 0 && input.charger.count > 0 && mapChargerCount !== input.charger.count) {
    contradictions.push({
      id: next(),
      severity: 'warning',
      field: 'charger.count',
      message: `${mapChargerCount} charger(s) on map but form says ${input.charger.count}. Accept the map patch or update the form.`,
    });
  }

  return contradictions;
}

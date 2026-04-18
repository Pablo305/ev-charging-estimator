// ============================================================
// Pure Turf.js Measurement Wrappers
// ============================================================

import turfLength from '@turf/length';
import turfDistance from '@turf/distance';
import { lineString, point } from '@turf/helpers';
import type { LineString, Point } from 'geojson';
import type { RunSegment, EquipmentPlacement, RunType, EquipmentType } from './types';

/**
 * Measure the length of a LineString in feet.
 */
export function measureRunLength(geometry: LineString): number {
  if (geometry.coordinates.length < 2) return 0;
  const feature = lineString(geometry.coordinates);
  const miles = turfLength(feature, { units: 'miles' });
  return Math.round(miles * 5280 * 100) / 100;
}

/**
 * Measure straight-line distance between two Points in feet.
 */
export function measurePointDistance(a: Point, b: Point): number {
  const pa = point(a.coordinates);
  const pb = point(b.coordinates);
  const miles = turfDistance(pa, pb, { units: 'miles' });
  return Math.round(miles * 5280 * 100) / 100;
}

/**
 * Sum lengths of all RunSegments of a given type.
 */
export function sumRunsByType(
  runs: readonly RunSegment[],
  type: RunType,
): number {
  return runs
    .filter((r) => r.runType === type)
    .reduce((sum, r) => sum + r.lengthFt, 0);
}

/**
 * Count equipment placements of given type(s).
 * Accepts a single type or array of types (for aggregating L2+L3 chargers).
 */
export function countEquipmentByType(
  equipment: readonly EquipmentPlacement[],
  type: EquipmentType | readonly EquipmentType[],
): number {
  const types = Array.isArray(type) ? type : [type];
  return equipment.filter((e) => types.includes(e.equipmentType)).length;
}

/**
 * Derived conduit/wire lengths for a trunk-and-branch install topology.
 *
 * Commercial parking-lot installs use one shared conduit trunk from the panel
 * to the furthest drop, with short branches at each charger. Prior code summed
 * panel-to-charger distances as if every charger needed its own home-run trench,
 * which overstated conduit by ~3× on multi-charger jobs.
 *
 * wireFt stays as the SUM — each drop needs its own conductors.
 * conduitFt is trunk + per-charger branch, × routing factor.
 */
export const INTER_CHARGER_BRANCH_FT = 15;
export const ROUTING_FACTOR = 1.15;

export interface DerivedRunLengths {
  /** Total wire length (sum of panel→each-charger distances) × routing factor */
  wireFt: number;
  /** Shared conduit trench length (max distance + per-charger branch) × routing factor */
  conduitFt: number;
  /** Max panel-to-charger distance × routing factor (used as electrical.distanceToPanel_ft) */
  trunkFt: number;
}

export function deriveRunLengths(
  distancesFt: readonly number[],
): DerivedRunLengths {
  if (distancesFt.length === 0) {
    return { wireFt: 0, conduitFt: 0, trunkFt: 0 };
  }
  const trunk = Math.max(...distancesFt);
  const wireTotal = distancesFt.reduce((a, b) => a + b, 0);
  const branchesFt = INTER_CHARGER_BRANCH_FT * (distancesFt.length - 1);

  return {
    wireFt: Math.round(wireTotal * ROUTING_FACTOR),
    conduitFt: Math.round((trunk + branchesFt) * ROUTING_FACTOR),
    trunkFt: Math.round(trunk * ROUTING_FACTOR),
  };
}

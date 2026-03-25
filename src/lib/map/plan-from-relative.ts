import type { LineString, Point } from 'geojson';
import type { EquipmentPlacement, RunSegment, RunType, EquipmentType } from '@/lib/map/types';
import { measureRunLength } from '@/lib/map/measurements';
import type { PlanAnalysisResponse } from '@/lib/ai/plan-analysis-types';

/** Map normalized 0–1 plan coordinates to a small area around the geocoded site (heuristic). */
export function relativeToLngLat(siteCoords: [number, number], relX: number, relY: number): [number, number] {
  const lat = siteCoords[1];
  const metersPerDegLat = 111_320;
  const metersPerDegLng = metersPerDegLat * Math.cos((lat * Math.PI) / 180);
  const spreadM = 55;
  const eastM = (relX - 0.5) * spreadM * 2;
  const northM = (relY - 0.5) * spreadM * 2;
  return [siteCoords[0] + eastM / metersPerDegLng, siteCoords[1] + northM / metersPerDegLat];
}

const RUN_TYPES = new Set<string>(['conduit', 'feeder', 'trench', 'bore', 'concrete_cut']);
const EQUIP_TYPES = new Set<string>([
  'charger_l2',
  'charger_l3',
  'transformer',
  'switchgear',
  'utility_meter',
  'meter_room',
  'junction_box',
  'bollard',
]);

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Convert AI plan analysis into map workspace geometry (requires site coordinates). */
export function planAnalysisToMapPlacements(
  analysis: PlanAnalysisResponse,
  siteCoords: [number, number],
): { runs: RunSegment[]; equipment: EquipmentPlacement[] } {
  const runs: RunSegment[] = [];
  const equipment: EquipmentPlacement[] = [];

  for (let i = 0; i < analysis.runs.length; i++) {
    const r = analysis.runs[i];
    const rt = RUN_TYPES.has(r.runType) ? (r.runType as RunType) : 'conduit';
    const coords = r.points.map((p) => relativeToLngLat(siteCoords, p[0], p[1]));
    if (coords.length < 2) continue;
    const geometry: LineString = { type: 'LineString', coordinates: coords };
    runs.push({
      id: nextId('plan-run'),
      runType: rt,
      geometry,
      lengthFt: measureRunLength(geometry),
      label: `Plan ${i + 1}`,
      createdAt: new Date().toISOString(),
    });
  }

  for (let i = 0; i < analysis.equipment.length; i++) {
    const e = analysis.equipment[i];
    const et = EQUIP_TYPES.has(e.equipmentType) ? (e.equipmentType as EquipmentType) : 'charger_l2';
    const lngLat = relativeToLngLat(siteCoords, e.relativeX, e.relativeY);
    const geometry: Point = { type: 'Point', coordinates: lngLat };
    equipment.push({
      id: nextId('plan-eq'),
      equipmentType: et,
      geometry,
      label: e.label || `${et.replace('_', ' ')} ${i + 1}`,
      properties: { source: 'plan_analysis' },
    });
  }

  return { runs, equipment };
}

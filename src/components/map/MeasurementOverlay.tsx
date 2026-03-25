'use client';

import type { RunSegment, EquipmentPlacement } from '@/lib/map/types';
import { RUN_TYPE_CONFIG, EQUIPMENT_TYPE_CONFIG } from '@/lib/map/constants';
import { sumRunsByType, countEquipmentByType } from '@/lib/map/measurements';
import type { RunType, EquipmentType } from '@/lib/map/types';
import { EquipmentIcon } from './EquipmentIcons';

interface MeasurementOverlayProps {
  runs: readonly RunSegment[];
  equipment: readonly EquipmentPlacement[];
}

export function MeasurementOverlay({ runs, equipment }: MeasurementOverlayProps) {
  const runTypes = Object.keys(RUN_TYPE_CONFIG) as RunType[];
  const equipmentTypes = Object.keys(EQUIPMENT_TYPE_CONFIG) as EquipmentType[];

  const runSummaries = runTypes
    .map((type) => ({
      type,
      config: RUN_TYPE_CONFIG[type],
      total: sumRunsByType(runs, type),
      count: runs.filter((r) => r.runType === type).length,
    }))
    .filter((s) => s.total > 0);

  const equipmentSummaries = equipmentTypes
    .map((type) => ({
      type,
      config: EQUIPMENT_TYPE_CONFIG[type],
      count: countEquipmentByType(equipment, type),
    }))
    .filter((s) => s.count > 0);

  if (runSummaries.length === 0 && equipmentSummaries.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-center text-xs text-gray-500">
        Draw runs or place equipment to see measurements
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Measurements
      </div>
      {runSummaries.map((s) => (
        <div
          key={s.type}
          className="flex items-center gap-2 rounded border border-gray-100 bg-white px-3 py-2 text-sm"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: s.config.color }}
          />
          <span className="flex-1 text-gray-700">{s.config.label}</span>
          <span className="font-mono font-medium text-gray-900">
            {Math.round(s.total)} ft
          </span>
          {s.count > 1 && (
            <span className="text-xs text-gray-400">({s.count} segments)</span>
          )}
        </div>
      ))}

      {equipmentSummaries.map((s) => (
        <div
          key={s.type}
          className="flex items-center gap-2 rounded border border-gray-100 bg-white px-3 py-2 text-sm"
        >
          <EquipmentIcon type={s.type} size={18} />
          <span className="flex-1 text-gray-700">{s.config.label}</span>
          <span className="font-mono font-medium text-gray-900">
            {s.count}x
          </span>
        </div>
      ))}
    </div>
  );
}

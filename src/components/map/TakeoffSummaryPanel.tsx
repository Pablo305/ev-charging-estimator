'use client';

import { useMemo } from 'react';
import type { EquipmentPlacement, RunSegment, EquipmentType } from '@/lib/map/types';
import { RUN_TYPE_CONFIG, EQUIPMENT_TYPE_CONFIG } from '@/lib/map/constants';
import { countEquipmentByType } from '@/lib/map/measurements';
import { MeasurementOverlay } from './MeasurementOverlay';
import { EquipmentIcon } from './EquipmentIcons';

interface TakeoffSummaryPanelProps {
  siteAddress: string;
  siteCoordinates: [number, number] | null;
  runs: readonly RunSegment[];
  equipment: readonly EquipmentPlacement[];
  lastSavedAt: string | null;
  onAddToEstimate: () => void;
  onStartNewEstimate: () => void;
  onResetTakeoff: () => void;
}

export function TakeoffSummaryPanel({
  siteAddress,
  siteCoordinates,
  runs,
  equipment,
  lastSavedAt,
  onAddToEstimate,
  onStartNewEstimate,
  onResetTakeoff,
}: TakeoffSummaryPanelProps) {
  const totalRunFt = useMemo(
    () => runs.reduce((sum, run) => sum + run.lengthFt, 0),
    [runs],
  );
  const chargerCount = useMemo(
    () => countEquipmentByType(equipment, ['charger_l2', 'charger_l3']),
    [equipment],
  );
  const canTransfer = runs.length > 0 || equipment.length > 0;
  const recentRuns = useMemo(() => [...runs].slice(-6).reverse(), [runs]);
  const groupedEquipment = useMemo(() => {
    const summary: Array<{ type: EquipmentType; count: number }> = [];
    for (const type of Object.keys(EQUIPMENT_TYPE_CONFIG) as EquipmentType[]) {
      const count = countEquipmentByType(equipment, type);
      if (count > 0) summary.push({ type, count });
    }
    return summary;
  }, [equipment]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Takeoff Summary</div>
            <p className="mt-1 text-xs text-gray-500">
              Standalone measurements stay local until you push them into an estimate.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            {lastSavedAt ? `Saved ${lastSavedAt}` : 'Local draft'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <SummaryStat label="Total footage" value={`${Math.round(totalRunFt)} ft`} />
          <SummaryStat label="Runs" value={String(runs.length)} />
          <SummaryStat label="Chargers" value={String(chargerCount)} />
          <SummaryStat label="Equipment" value={String(equipment.length)} />
        </div>

        {(siteAddress || siteCoordinates) && (
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Site</div>
            {siteAddress && <div className="mt-1 font-medium text-gray-800">{siteAddress}</div>}
            {siteCoordinates && (
              <div className="mt-1 text-gray-500">
                {siteCoordinates[1].toFixed(6)}, {siteCoordinates[0].toFixed(6)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <MeasurementOverlay runs={runs} equipment={equipment} />
      </div>

      {recentRuns.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-gray-900">Recent Run Measurements</div>
          <div className="space-y-2">
            {recentRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium text-gray-800">{RUN_TYPE_CONFIG[run.runType].label}</div>
                  <div className="text-xs text-gray-500">{run.geometry.coordinates.length} points</div>
                </div>
                <div className="font-mono text-sm font-semibold text-gray-900">
                  {Math.round(run.lengthFt)} ft
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {groupedEquipment.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-gray-900">Equipment Placed</div>
          <div className="space-y-2">
            {groupedEquipment.map(({ type, count }) => (
              <div
                key={type}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
              >
                <EquipmentIcon type={type} size={18} />
                <span className="flex-1 text-gray-700">{EQUIPMENT_TYPE_CONFIG[type].label}</span>
                <span className="font-mono font-semibold text-gray-900">{count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 shadow-sm">
        <div className="text-sm font-semibold text-sky-950">Use This Takeoff</div>
        <p className="mt-1 text-xs text-sky-900/70">
          Push the current measurements into an existing estimate or start a clean estimate from this site takeoff.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onAddToEstimate}
            disabled={!canTransfer}
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
          >
            Add to current estimate
          </button>
          <button
            type="button"
            onClick={onStartNewEstimate}
            disabled={!canTransfer}
            className="rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:border-sky-100 disabled:text-sky-300"
          >
            Start new estimate from takeoff
          </button>
          <button
            type="button"
            onClick={onResetTakeoff}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition hover:bg-white hover:text-gray-800"
          >
            Reset standalone takeoff
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-base font-semibold text-gray-900">{value}</div>
    </div>
  );
}

'use client';

import type { MapWorkspaceState } from '@/lib/map/types';
import { AddressSearch } from './AddressSearch';
import { MeasurementOverlay } from './MeasurementOverlay';

interface SiteInfoPanelProps {
  mapState: MapWorkspaceState;
  onAddressSelect: (address: string, coordinates: [number, number]) => void;
}

export function SiteInfoPanel({ mapState, onAddressSelect }: SiteInfoPanelProps) {
  const totalRunFt = mapState.runs.reduce((sum, r) => sum + r.lengthFt, 0);
  const hasData = mapState.siteCoordinates !== null;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="text-sm font-semibold text-gray-800">Site Info</div>

      <AddressSearch
        onAddressSelect={onAddressSelect}
        initialAddress={mapState.siteAddress}
      />

      {mapState.siteCoordinates && (
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Coordinates</div>
          {mapState.siteCoordinates[1].toFixed(6)}, {mapState.siteCoordinates[0].toFixed(6)}
        </div>
      )}

      {!hasData && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-4 text-center">
          <div className="mb-2 text-2xl">📍</div>
          <div className="text-xs font-medium text-gray-600">Enter an address to get started</div>
          <div className="mt-1 text-[11px] text-gray-400">
            AI will analyze satellite and street view imagery to suggest charger placement
          </div>
        </div>
      )}

      <MeasurementOverlay runs={mapState.runs} equipment={mapState.equipment} />

      {/* Summary stats */}
      <div className="mt-auto border-t border-gray-100 pt-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-gray-50 p-2 text-center">
            <div className="text-lg font-bold text-gray-900">
              {mapState.runs.length}
            </div>
            <div className="text-[10px] text-gray-500">Runs</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-2 text-center">
            <div className="text-lg font-bold text-gray-900">
              {mapState.equipment.length}
            </div>
            <div className="text-[10px] text-gray-500">Equipment</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-2 text-center">
            <div className="text-lg font-bold text-gray-900">
              {totalRunFt > 0 ? `${Math.round(totalRunFt)}` : '0'}
            </div>
            <div className="text-[10px] text-gray-500">Total ft</div>
          </div>
        </div>
      </div>
    </div>
  );
}

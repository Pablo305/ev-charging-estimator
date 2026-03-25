'use client';

import { useReducer, useEffect, useState, useCallback } from 'react';
import type { EstimateInput } from '@/lib/estimate/types';
import { initialMapState, mapReducer } from '@/lib/map/workspace-reducer';
import { SiteMap } from './SiteMap';
import { StreetViewPanel } from './StreetViewPanel';

type CenterView = 'satellite' | 'streetview';

interface SharedEstimateMapViewerProps {
  input: EstimateInput;
}

/** Read-only map + Street View for shared interactive estimate pages. */
export function SharedEstimateMapViewer({ input }: SharedEstimateMapViewerProps) {
  const [mapState, dispatch] = useReducer(mapReducer, undefined, initialMapState);
  const [centerView, setCenterView] = useState<CenterView>('satellite');

  useEffect(() => {
    const coords = input.mapWorkspace?.siteCoordinates;
    if (coords) {
      dispatch({
        type: 'SET_ADDRESS',
        address: input.site.address || '',
        coordinates: coords,
      });
    }
    const saved = input.mapWorkspace?.drawings;
    if (!saved) return;
    if (saved.runs?.length) {
      for (const run of saved.runs) {
        dispatch({ type: 'ADD_RUN', run: run as never });
      }
    }
    if (saved.equipment?.length) {
      for (const eq of saved.equipment) {
        dispatch({ type: 'ADD_EQUIPMENT', equipment: eq as never });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noop = useCallback(() => {}, []);

  if (!input.mapWorkspace?.siteCoordinates) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
        No map location was saved with this estimate. Add a site address and use Map Workspace to attach coordinates.
      </div>
    );
  }

  return (
    <div className="flex h-[min(520px,70vh)] min-h-[320px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <span className="text-xs font-medium text-gray-600">Site preview (read-only)</span>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setCenterView('satellite')}
            className={`rounded-md px-3 py-1 font-medium transition ${
              centerView === 'satellite' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setCenterView('streetview')}
            className={`rounded-md px-3 py-1 font-medium transition ${
              centerView === 'streetview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Street View
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {centerView === 'satellite' ? (
          <SiteMap
            siteCoordinates={mapState.siteCoordinates}
            runs={mapState.runs}
            equipment={mapState.equipment}
            selectedTool={null}
            selectedFeatureId={null}
            powerSourceLocation={mapState.powerSourceLocation}
            chargerZones={mapState.chargerZones}
            onRunCreate={noop}
            onRunUpdate={noop}
            onRunDelete={noop}
            onEquipmentPlace={noop}
            onEquipmentUpdate={noop}
            onEquipmentDelete={noop}
            onFeatureSelect={noop}
            onPointToolPlace={noop}
          />
        ) : (
          <StreetViewPanel
            coordinates={mapState.siteCoordinates}
            equipment={mapState.equipment}
            onAnalyze={noop}
            isAnalyzing={false}
            readOnly
          />
        )}
      </div>
    </div>
  );
}

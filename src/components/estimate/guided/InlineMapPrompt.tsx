'use client';

import { useReducer, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useEstimate } from '@/contexts/EstimateContext';
import { mapReducer, initialMapState } from '@/lib/map/workspace-reducer';
import { generatePatches } from '@/lib/map/sync';
import type { ConditionalField } from '@/lib/estimate/guided-flow-config';
import type { RunType, EquipmentType, PointToolType, RunSegment } from '@/lib/map/types';
import type { LineString, Point } from 'geojson';

const SiteMap = dynamic(() => import('@/components/map/SiteMap').then((m) => m.SiteMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-lg bg-gray-100">
      <p className="text-sm text-gray-400">Loading map...</p>
    </div>
  ),
});

const DrawingToolbar = dynamic(
  () => import('@/components/map/DrawingToolbar').then((m) => m.DrawingToolbar),
  { ssr: false },
);

interface InlineMapPromptProps {
  /** Only the mapDerived fields for the current installation type */
  fields: ConditionalField[];
  /** Suggested drawing tools from the template */
  suggestedTools: string[];
}

/** Safely read a nested value from an object using a dot-separated path. */
function readPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

let runIdCounter = 0;

export function InlineMapPrompt({ fields, suggestedTools }: InlineMapPromptProps) {
  const { input, applyPatches } = useEstimate();
  const siteCoordinates = input.mapWorkspace?.siteCoordinates ?? null;
  const inputRecord = input as unknown as Record<string, unknown>;

  const [mapState, dispatch] = useReducer(mapReducer, undefined, initialMapState);

  // Sync siteCoordinates from estimate context into local map state
  useEffect(() => {
    if (siteCoordinates) {
      dispatch({
        type: 'SET_ADDRESS',
        address: input.site.address,
        coordinates: siteCoordinates,
      });
    }
  }, [siteCoordinates, input.site.address]);

  // After any run change, sync measurements to estimate context
  const syncToEstimate = useCallback(
    (updatedState: typeof mapState) => {
      const batch = generatePatches(updatedState, input);
      const accepted = batch.patches.filter((p) => p.status === 'accepted');
      if (accepted.length > 0) {
        applyPatches(
          accepted.map((p) => ({ fieldPath: p.fieldPath, value: p.proposedValue })),
        );
      }
    },
    [input, applyPatches],
  );

  const handleRunCreate = useCallback(
    (runType: RunType, geometry: LineString, lengthFt: number) => {
      runIdCounter += 1;
      const run: RunSegment = {
        id: `guided-run-${runIdCounter}`,
        runType,
        geometry,
        lengthFt,
        label: `${Math.round(lengthFt)} ft`,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_RUN', run });
      // Compute new state manually for sync (reducer is synchronous)
      const newState = mapReducer(mapState, { type: 'ADD_RUN', run });
      syncToEstimate(newState);
    },
    [mapState, syncToEstimate],
  );

  const handleRunUpdate = useCallback(
    (id: string, geometry: LineString, lengthFt: number) => {
      dispatch({ type: 'UPDATE_RUN', id, geometry, lengthFt });
      const newState = mapReducer(mapState, { type: 'UPDATE_RUN', id, geometry, lengthFt });
      syncToEstimate(newState);
    },
    [mapState, syncToEstimate],
  );

  const handleRunDelete = useCallback(
    (id: string) => {
      dispatch({ type: 'DELETE_RUN', id });
      const newState = mapReducer(mapState, { type: 'DELETE_RUN', id });
      syncToEstimate(newState);
    },
    [mapState, syncToEstimate],
  );

  const handleEquipmentPlace = useCallback(
    (equipmentType: EquipmentType, geometry: Point) => {
      runIdCounter += 1;
      const equipment = {
        id: `guided-eq-${runIdCounter}`,
        equipmentType,
        geometry,
        label: equipmentType,
        properties: {},
      };
      dispatch({ type: 'ADD_EQUIPMENT', equipment });
    },
    [],
  );

  const handleEquipmentUpdate = useCallback(
    (id: string, geometry: Point) => {
      dispatch({ type: 'UPDATE_EQUIPMENT', id, geometry });
    },
    [],
  );

  const handleEquipmentDelete = useCallback(
    (id: string) => {
      dispatch({ type: 'DELETE_EQUIPMENT', id });
    },
    [],
  );

  const handleFeatureSelect = useCallback(
    (id: string | null) => {
      dispatch({ type: 'SELECT_FEATURE', featureId: id });
    },
    [],
  );

  const handlePointToolPlace = useCallback(
    (toolType: PointToolType, coordinates: [number, number]) => {
      if (toolType === 'power_source') {
        dispatch({ type: 'SET_POWER_SOURCE', coordinates });
      } else if (toolType === 'charger_zone') {
        dispatch({ type: 'SET_CHARGER_ZONE', coordinates });
      }
    },
    [],
  );

  const handleSelectTool = useCallback(
    (tool: RunType | EquipmentType | PointToolType | null) => {
      dispatch({ type: 'SELECT_TOOL', tool });
    },
    [],
  );

  const handleClearAll = useCallback(() => {
    dispatch({ type: 'RESET' });
    // Re-set coordinates after reset
    if (siteCoordinates) {
      dispatch({
        type: 'SET_ADDRESS',
        address: input.site.address,
        coordinates: siteCoordinates,
      });
    }
  }, [siteCoordinates, input.site.address]);

  const handleUndo = useCallback(() => {
    // Simple undo: delete the last run
    const lastRun = mapState.runs[mapState.runs.length - 1];
    if (lastRun) {
      dispatch({ type: 'DELETE_RUN', id: lastRun.id });
      const newState = mapReducer(mapState, { type: 'DELETE_RUN', id: lastRun.id });
      syncToEstimate(newState);
    }
  }, [mapState, syncToEstimate]);

  // Mutable arrays from readonly for SiteMap props
  const runs = useMemo(() => [...mapState.runs], [mapState.runs]);
  const equipment = useMemo(() => [...mapState.equipment], [mapState.equipment]);
  const chargerZones = useMemo(() => [...mapState.chargerZones], [mapState.chargerZones]);

  if (!siteCoordinates) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-500">
          Enter an address above to enable the map.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--system-blue)]/20 bg-[var(--system-blue)]/5 p-4">
        <p className="text-sm text-[var(--system-blue)]">
          Draw on the satellite map to auto-measure distances. Double-click to finish a line.
        </p>
      </div>

      {/* Map + toolbar */}
      <div className="relative">
        <div className="h-[400px] rounded-lg overflow-hidden border border-gray-200">
          <SiteMap
            siteCoordinates={siteCoordinates}
            runs={runs}
            equipment={equipment}
            selectedTool={mapState.selectedTool}
            selectedFeatureId={mapState.selectedFeatureId}
            powerSourceLocation={mapState.powerSourceLocation}
            chargerZones={chargerZones}
            onRunCreate={handleRunCreate}
            onRunUpdate={handleRunUpdate}
            onRunDelete={handleRunDelete}
            onEquipmentPlace={handleEquipmentPlace}
            onEquipmentUpdate={handleEquipmentUpdate}
            onEquipmentDelete={handleEquipmentDelete}
            onFeatureSelect={handleFeatureSelect}
            onPointToolPlace={handlePointToolPlace}
          />
        </div>

        {/* Drawing toolbar overlay */}
        {suggestedTools.length > 0 && (
          <div className="absolute top-2 left-2 z-10">
            <DrawingToolbar
              selectedTool={mapState.selectedTool}
              onSelectTool={handleSelectTool}
              onClearAll={handleClearAll}
              onUndo={handleUndo}
            />
          </div>
        )}
      </div>

      {/* Map-derived fields and their current values */}
      {fields.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Map-Derived Measurements
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((field) => {
              const val = readPath(inputRecord, field.fieldPath);
              const display = val !== null && val !== undefined ? String(val) : '\u2014';
              return (
                <div key={field.id} className="flex items-baseline justify-between gap-2 rounded-md bg-gray-50 px-3 py-2">
                  <span className="text-xs text-gray-500">{field.label}</span>
                  <span className="text-sm font-medium text-gray-900">{display}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

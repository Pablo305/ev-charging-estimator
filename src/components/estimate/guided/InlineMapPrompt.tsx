'use client';

import { useReducer, useEffect, useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useEstimate } from '@/contexts/EstimateContext';
import { mapReducer, initialMapState } from '@/lib/map/workspace-reducer';
import { measurePointDistance } from '@/lib/map/measurements';
import type { ConditionalField } from '@/lib/estimate/guided-flow-config';
import type { EquipmentType, PointToolType, RunType } from '@/lib/map/types';
import type { LineString, Point } from 'geojson';

const SiteMap = dynamic(() => import('@/components/map/SiteMap').then((m) => m.SiteMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-lg bg-gray-100">
      <p className="text-sm text-gray-400">Loading satellite map...</p>
    </div>
  ),
});

interface InlineMapPromptProps {
  fields: ConditionalField[];
  suggestedTools: string[];
}

type SimpleTool = 'charger' | 'panel' | null;

let eqIdCounter = 0;

export function InlineMapPrompt({ fields }: InlineMapPromptProps) {
  const { input, updateField } = useEstimate();
  const siteCoordinates = input.mapWorkspace?.siteCoordinates ?? null;

  const [mapState, dispatch] = useReducer(mapReducer, undefined, initialMapState);
  const [activeTool, setActiveTool] = useState<SimpleTool>(null);

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

  // Count chargers and panel from equipment placements
  const chargerPlacements = useMemo(
    () => mapState.equipment.filter((e) => e.equipmentType === 'charger_l2' || e.equipmentType === 'charger_l3'),
    [mapState.equipment],
  );
  const panelPlacement = useMemo(
    () => mapState.equipment.find((e) => e.equipmentType === 'panel'),
    [mapState.equipment],
  );

  // Auto-calculate distances whenever placements change
  useEffect(() => {
    // Update charger count
    const chargerCount = chargerPlacements.length;
    if (chargerCount > 0) {
      updateField('mapWorkspace.chargerCountFromMap', chargerCount);
    }

    // Update panel placed flag
    updateField('mapWorkspace.hasPanelPlaced', !!panelPlacement);

    // Calculate distance from panel to each charger (sum for total conduit/conductor)
    if (panelPlacement && chargerPlacements.length > 0) {
      let totalDistance = 0;
      for (const charger of chargerPlacements) {
        totalDistance += measurePointDistance(panelPlacement.geometry, charger.geometry);
      }
      // Add 15% buffer for routing (not straight-line)
      const buffered = Math.round(totalDistance * 1.15);

      updateField('mapWorkspace.conduitDistance_ft', buffered);
      updateField('mapWorkspace.trenchingDistance_ft', buffered);
      updateField('mapWorkspace.pvcConduitDistance_ft', buffered);
      updateField('electrical.wire500mcm_ft', buffered);
      updateField('mapWorkspace.concreteCuttingDistance_ft', 0);
      updateField('electrical.distanceToPanel_ft', chargerPlacements.length > 0
        ? Math.round(measurePointDistance(panelPlacement.geometry, chargerPlacements[0].geometry) * 1.15)
        : null,
      );
    }

    // Concrete pads = charger count
    if (chargerCount > 0) {
      updateField('mapWorkspace.concretePadCount', chargerCount);
      updateField('accessories.padRequired', true);
    }
  }, [chargerPlacements, panelPlacement, updateField]);

  // Map the simple tool to actual SiteMap tool types
  const selectedMapTool: RunType | EquipmentType | PointToolType | null = useMemo(() => {
    if (activeTool === 'charger') return 'charger_l2';
    if (activeTool === 'panel') return 'panel';
    return null;
  }, [activeTool]);

  const handleEquipmentPlace = useCallback(
    (equipmentType: EquipmentType, geometry: Point) => {
      // If placing panel and one already exists, replace it
      if (equipmentType === 'panel' && panelPlacement) {
        dispatch({ type: 'DELETE_EQUIPMENT', id: panelPlacement.id });
      }

      eqIdCounter += 1;
      const equipment = {
        id: `eq-${eqIdCounter}`,
        equipmentType,
        geometry,
        label: equipmentType === 'panel' ? 'Electrical Panel' : `Charger ${chargerPlacements.length + 1}`,
        properties: {},
      };
      dispatch({ type: 'ADD_EQUIPMENT', equipment });

      // Auto-deselect tool after placing panel (only 1 needed)
      if (equipmentType === 'panel') {
        setActiveTool(null);
      }
    },
    [panelPlacement, chargerPlacements.length],
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

  // Mutable arrays for SiteMap props
  const runs = useMemo(() => [...mapState.runs], [mapState.runs]);
  const equipment = useMemo(() => [...mapState.equipment], [mapState.equipment]);
  const chargerZones = useMemo(() => [...mapState.chargerZones], [mapState.chargerZones]);

  if (!siteCoordinates) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">
          Enter a job site address above to enable the satellite map.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Simple instruction */}
      <div className="rounded-lg bg-[#13b3cf]/10 px-4 py-3">
        <p className="text-sm font-medium text-[#0e9ab3]">
          {!panelPlacement && chargerPlacements.length === 0
            ? '1. Click "Place Charger" then tap on the map where chargers will go'
            : !panelPlacement
              ? '2. Now click "Place Panel" and tap where the electrical panel is'
              : `Done! ${chargerPlacements.length} charger${chargerPlacements.length !== 1 ? 's' : ''} placed. Distances auto-calculated. Drag icons to adjust.`}
        </p>
      </div>

      {/* Two simple tool buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTool(activeTool === 'charger' ? null : 'charger')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            activeTool === 'charger'
              ? 'bg-[#2563EB] text-white shadow-md ring-2 ring-[#2563EB]/30'
              : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="12" height="14" rx="2"/><circle cx="12" cy="12" r="1.5"/><rect x="5" y="3" width="14" height="1.5" rx="0.5"/></svg>
          Place Charger {chargerPlacements.length > 0 && <span className="rounded-full bg-white/20 px-1.5 text-xs">{chargerPlacements.length}</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTool(activeTool === 'panel' ? null : 'panel')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            activeTool === 'panel'
              ? 'bg-[#2563EB] text-white shadow-md ring-2 ring-[#2563EB]/30'
              : panelPlacement
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="1.5"/><rect x="7" y="5" width="4" height="1.5" rx="0.3"/><rect x="7" y="8" width="4" height="1.5" rx="0.3"/><rect x="13" y="5" width="4" height="1.5" rx="0.3"/></svg>
          {panelPlacement ? 'Panel Placed' : 'Place Panel'}
        </button>

        {(chargerPlacements.length > 0 || panelPlacement) && (
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'RESET' });
              if (siteCoordinates) {
                dispatch({ type: 'SET_ADDRESS', address: input.site.address, coordinates: siteCoordinates });
              }
              setActiveTool(null);
            }}
            className="ml-auto rounded-lg px-3 py-2.5 text-xs font-medium text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Map */}
      <div className="relative h-[400px] rounded-lg overflow-hidden border border-gray-200 shadow-sm">
        <SiteMap
          siteCoordinates={siteCoordinates}
          runs={runs}
          equipment={equipment}
          selectedTool={selectedMapTool}
          selectedFeatureId={mapState.selectedFeatureId}
          powerSourceLocation={mapState.powerSourceLocation}
          chargerZones={chargerZones}
          onRunCreate={() => {}}
          onRunUpdate={() => {}}
          onRunDelete={() => {}}
          onEquipmentPlace={handleEquipmentPlace}
          onEquipmentUpdate={handleEquipmentUpdate}
          onEquipmentDelete={handleEquipmentDelete}
          onFeatureSelect={handleFeatureSelect}
          onPointToolPlace={() => {}}
        />
      </div>

      {/* Auto-calculated measurements */}
      {panelPlacement && chargerPlacements.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Auto-Calculated from Map
          </h4>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md bg-white px-3 py-2">
              <span className="text-[0.6875rem] text-gray-500">Chargers</span>
              <p className="text-sm font-bold text-gray-900">{chargerPlacements.length}</p>
            </div>
            <div className="rounded-md bg-white px-3 py-2">
              <span className="text-[0.6875rem] text-gray-500">Est. Distance</span>
              <p className="text-sm font-bold text-gray-900">
                {input.mapWorkspace?.conduitDistance_ft
                  ? `${input.mapWorkspace.conduitDistance_ft} ft`
                  : '\u2014'}
              </p>
            </div>
            <div className="rounded-md bg-white px-3 py-2">
              <span className="text-[0.6875rem] text-gray-500">Panel to Nearest</span>
              <p className="text-sm font-bold text-gray-900">
                {input.electrical?.distanceToPanel_ft
                  ? `${input.electrical.distanceToPanel_ft} ft`
                  : '\u2014'}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[0.6875rem] text-emerald-600">
            Distances include 15% routing buffer. Right-click icons to remove. Drag to reposition.
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import type { EstimateInput, EstimateOutput } from '@/lib/estimate/types';
import type {
  MapWorkspaceState,
  MapAction,
  RunType,
  EquipmentType,
  PatchBatch,
  EstimatePatch,
} from '@/lib/map/types';
import { PATCH_DEBOUNCE_MS } from '@/lib/map/constants';
import { measureRunLength } from '@/lib/map/measurements';
import { generatePatches, applyPatches } from '@/lib/map/sync';
import { generateEquipmentLabel } from './EquipmentLayer';
import { SiteMap } from './SiteMap';
import { StreetViewPanel } from './StreetViewPanel';
import { DrawingToolbar } from './DrawingToolbar';
import { SiteInfoPanel } from './SiteInfoPanel';
import { PatchReviewPanel } from './PatchReviewPanel';
import { EstimateImpactPanel } from './EstimateImpactPanel';
import type { LineString, Point } from 'geojson';

// ── Reducer ──

function initialState(): MapWorkspaceState {
  return {
    siteAddress: '',
    siteCoordinates: null,
    runs: [],
    equipment: [],
    selectedTool: null,
    selectedFeatureId: null,
  };
}

function mapReducer(state: MapWorkspaceState, action: MapAction): MapWorkspaceState {
  switch (action.type) {
    case 'SET_ADDRESS':
      return { ...state, siteAddress: action.address, siteCoordinates: action.coordinates };

    case 'SELECT_TOOL':
      return { ...state, selectedTool: action.tool, selectedFeatureId: null };

    case 'SELECT_FEATURE':
      return { ...state, selectedFeatureId: action.featureId };

    case 'ADD_RUN':
      return { ...state, runs: [...state.runs, action.run] };

    case 'UPDATE_RUN':
      return {
        ...state,
        runs: state.runs.map((r) =>
          r.id === action.id
            ? { ...r, geometry: action.geometry, lengthFt: action.lengthFt }
            : r,
        ),
      };

    case 'DELETE_RUN':
      return { ...state, runs: state.runs.filter((r) => r.id !== action.id) };

    case 'ADD_EQUIPMENT':
      return { ...state, equipment: [...state.equipment, action.equipment] };

    case 'UPDATE_EQUIPMENT':
      return {
        ...state,
        equipment: state.equipment.map((e) =>
          e.id === action.id ? { ...e, geometry: action.geometry } : e,
        ),
      };

    case 'DELETE_EQUIPMENT':
      return { ...state, equipment: state.equipment.filter((e) => e.id !== action.id) };

    case 'RESET':
      return initialState();

    default:
      return state;
  }
}

// ── Props ──

interface MapWorkspaceProps {
  input: EstimateInput;
  estimate: EstimateOutput | null;
  onInputChange: (newInput: EstimateInput) => void;
}

// ── Component ──

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

type CenterView = 'satellite' | 'streetview';

interface StreetViewAnalysisResult {
  siteDescription?: string;
  inferredFields?: Record<string, unknown>;
  observations?: Record<string, string>;
  mountRecommendation?: { type: string | null; reason: string; suggestedLocations: string };
  concerns?: string[];
  confidence?: number;
}

export function MapWorkspace({ input, estimate, onInputChange }: MapWorkspaceProps) {
  const [mapState, dispatch] = useReducer(mapReducer, undefined, initialState);
  const [patchBatch, setPatchBatch] = useState<PatchBatch | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [centerView, setCenterView] = useState<CenterView>('satellite');
  const [isAnalyzingStreetView, setIsAnalyzingStreetView] = useState(false);
  const [streetViewAnalysis, setStreetViewAnalysis] = useState<StreetViewAnalysisResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load address from input
  useEffect(() => {
    if (input.site.address && !mapState.siteAddress) {
      // Geocode the address to get coordinates
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input.site.address)}.json?access_token=${token}&country=us&limit=1`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.features?.length > 0) {
            const center = data.features[0].center as [number, number];
            dispatch({
              type: 'SET_ADDRESS',
              address: input.site.address,
              coordinates: center,
            });
          }
        })
        .catch(() => {});
    }
  }, [input.site.address, mapState.siteAddress]);

  // Debounced patch generation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const batch = generatePatches(mapState, input);
      setPatchBatch(batch.patches.length > 0 ? batch : null);
    }, PATCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [mapState, input]);

  // ── Callbacks ──

  const handleAddressSelect = useCallback(
    (address: string, coordinates: [number, number]) => {
      dispatch({ type: 'SET_ADDRESS', address, coordinates });
    },
    [],
  );

  const handleSelectTool = useCallback(
    (tool: RunType | EquipmentType | null) => {
      dispatch({ type: 'SELECT_TOOL', tool });
    },
    [],
  );

  const handleRunCreate = useCallback(
    (runType: RunType, geometry: LineString, lengthFt: number) => {
      dispatch({
        type: 'ADD_RUN',
        run: {
          id: nextId('run'),
          runType,
          geometry,
          lengthFt,
          label: `${runType} ${Math.round(lengthFt)}ft`,
          createdAt: new Date().toISOString(),
        },
      });
    },
    [],
  );

  const handleRunUpdate = useCallback(
    (id: string, geometry: LineString, lengthFt: number) => {
      dispatch({ type: 'UPDATE_RUN', id, geometry, lengthFt });
    },
    [],
  );

  const handleRunDelete = useCallback(
    (id: string) => {
      dispatch({ type: 'DELETE_RUN', id });
    },
    [],
  );

  const handleEquipmentPlace = useCallback(
    (equipmentType: EquipmentType, geometry: Point) => {
      const label = generateEquipmentLabel(
        equipmentType,
        mapState.equipment.filter((e) => e.equipmentType === equipmentType).length,
      );
      dispatch({
        type: 'ADD_EQUIPMENT',
        equipment: {
          id: nextId('eq'),
          equipmentType,
          geometry,
          label,
          properties: {},
        },
      });
    },
    [mapState.equipment],
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

  // ── Patch management ──

  const updatePatchStatus = useCallback(
    (patchId: string, status: EstimatePatch['status']) => {
      if (!patchBatch) return;
      const updated: PatchBatch = {
        ...patchBatch,
        patches: patchBatch.patches.map((p) =>
          p.id === patchId ? { ...p, status } : p,
        ),
      };
      setPatchBatch(updated);

      // If all patches resolved, apply accepted ones
      const allResolved = updated.patches.every((p) => p.status !== 'pending');
      if (allResolved) {
        const newInput = applyPatches(input, updated.patches);
        onInputChange(newInput);
      }
    },
    [patchBatch, input, onInputChange],
  );

  const handleAcceptPatch = useCallback(
    (patchId: string) => updatePatchStatus(patchId, 'accepted'),
    [updatePatchStatus],
  );

  const handleRejectPatch = useCallback(
    (patchId: string) => updatePatchStatus(patchId, 'rejected'),
    [updatePatchStatus],
  );

  const handleAcceptAll = useCallback(() => {
    if (!patchBatch) return;
    const updated: PatchBatch = {
      ...patchBatch,
      patches: patchBatch.patches.map((p) =>
        p.status === 'pending' ? { ...p, status: 'accepted' as const } : p,
      ),
    };
    setPatchBatch(updated);
    const newInput = applyPatches(input, updated.patches);
    onInputChange(newInput);
  }, [patchBatch, input, onInputChange]);

  const handleRejectAll = useCallback(() => {
    if (!patchBatch) return;
    setPatchBatch({
      ...patchBatch,
      patches: patchBatch.patches.map((p) =>
        p.status === 'pending' ? { ...p, status: 'rejected' as const } : p,
      ),
    });
  }, [patchBatch]);

  // ── Street View AI analysis ──

  const handleStreetViewAnalyze = useCallback(async (imageUrl: string) => {
    setIsAnalyzingStreetView(true);
    setStreetViewAnalysis(null);
    try {
      const res = await fetch('/api/ai/analyze-streetview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Street View analysis failed:', errData);
        return;
      }
      const data = await res.json();
      if (data.analysis) {
        setStreetViewAnalysis(data.analysis as StreetViewAnalysisResult);
      }
    } catch (err) {
      console.error('Street View analysis error:', err);
    } finally {
      setIsAnalyzingStreetView(false);
    }
  }, []);

  // ── Delete selected feature ──

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (!mapState.selectedFeatureId) return;

        const isRun = mapState.runs.some((r) => r.id === mapState.selectedFeatureId);
        if (isRun) {
          handleRunDelete(mapState.selectedFeatureId);
        } else {
          handleEquipmentDelete(mapState.selectedFeatureId);
        }
        dispatch({ type: 'SELECT_FEATURE', featureId: null });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mapState.selectedFeatureId, mapState.runs, handleRunDelete, handleEquipmentDelete]);

  return (
    <div className="flex h-full">
      {/* Left Panel - Site Info */}
      <div
        className={`border-r border-gray-200 bg-white transition-all ${
          leftPanelOpen ? 'w-[280px]' : 'w-0 overflow-hidden'
        }`}
      >
        {leftPanelOpen && (
          <SiteInfoPanel
            mapState={mapState}
            onAddressSelect={handleAddressSelect}
          />
        )}
      </div>

      {/* Center - Map/StreetView + Toolbar */}
      <div className="relative flex-1">
        {/* Toggle buttons */}
        <div className="absolute left-2 top-2 z-10 flex gap-1">
          <button
            onClick={() => setLeftPanelOpen((v) => !v)}
            className="rounded bg-white px-2 py-1 text-xs shadow hover:bg-gray-50"
            title="Toggle site info panel"
          >
            {leftPanelOpen ? '<' : '>'}
          </button>
        </div>

        {/* View toggle (satellite / street view) */}
        <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2">
          <div className="flex rounded-lg bg-white shadow">
            <button
              onClick={() => setCenterView('satellite')}
              className={`rounded-l-lg px-4 py-1.5 text-xs font-medium transition ${
                centerView === 'satellite'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Satellite Map
            </button>
            <button
              onClick={() => setCenterView('streetview')}
              className={`rounded-r-lg px-4 py-1.5 text-xs font-medium transition ${
                centerView === 'streetview'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Street View
            </button>
          </div>
        </div>

        <div className="absolute right-2 top-2 z-10 flex gap-1">
          <button
            onClick={() => setRightPanelOpen((v) => !v)}
            className="rounded bg-white px-2 py-1 text-xs shadow hover:bg-gray-50"
            title="Toggle estimate panel"
          >
            {rightPanelOpen ? '>' : '<'}
          </button>
        </div>

        {centerView === 'satellite' ? (
          <>
            {/* Floating toolbar */}
            <div className="absolute left-2 top-12 z-10">
              <DrawingToolbar
                selectedTool={mapState.selectedTool}
                onSelectTool={handleSelectTool}
              />
            </div>

            {/* Active tool indicator */}
            {mapState.selectedTool && (
              <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
                {mapState.selectedTool.replace('_', ' ')} mode — Click to draw, double-click to finish
              </div>
            )}

            <SiteMap
              siteCoordinates={mapState.siteCoordinates}
              runs={mapState.runs}
              equipment={mapState.equipment}
              selectedTool={mapState.selectedTool}
              selectedFeatureId={mapState.selectedFeatureId}
              onRunCreate={handleRunCreate}
              onRunUpdate={handleRunUpdate}
              onRunDelete={handleRunDelete}
              onEquipmentPlace={handleEquipmentPlace}
              onEquipmentUpdate={handleEquipmentUpdate}
              onEquipmentDelete={handleEquipmentDelete}
              onFeatureSelect={handleFeatureSelect}
            />
          </>
        ) : (
          <StreetViewPanel
            coordinates={mapState.siteCoordinates}
            equipment={mapState.equipment}
            onAnalyze={handleStreetViewAnalyze}
            isAnalyzing={isAnalyzingStreetView}
          />
        )}
      </div>

      {/* Right Panel - Patches + Estimate */}
      <div
        className={`border-l border-gray-200 bg-white transition-all ${
          rightPanelOpen ? 'w-[320px]' : 'w-0 overflow-hidden'
        }`}
      >
        {rightPanelOpen && (
          <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
            <div className="text-sm font-semibold text-gray-800">
              Map → Estimate Sync
            </div>

            <PatchReviewPanel
              batch={patchBatch}
              onAcceptPatch={handleAcceptPatch}
              onRejectPatch={handleRejectPatch}
              onAcceptAll={handleAcceptAll}
              onRejectAll={handleRejectAll}
            />

            <EstimateImpactPanel estimate={estimate} />

            {/* Street View Analysis Results */}
            {streetViewAnalysis && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="mb-2 text-sm font-semibold text-blue-900">
                  Street View AI Analysis
                </div>
                {streetViewAnalysis.confidence != null && (
                  <div className="mb-2 text-xs text-blue-700">
                    Confidence: {Math.round(streetViewAnalysis.confidence * 100)}%
                  </div>
                )}
                {streetViewAnalysis.siteDescription && (
                  <p className="mb-2 text-xs text-gray-700">
                    {streetViewAnalysis.siteDescription}
                  </p>
                )}

                {streetViewAnalysis.observations && (
                  <div className="mb-2">
                    <div className="mb-1 text-xs font-medium text-blue-800">Observations</div>
                    <div className="space-y-1">
                      {Object.entries(streetViewAnalysis.observations).map(([key, value]) => (
                        <div key={key} className="text-xs text-gray-600">
                          <span className="font-medium capitalize text-gray-700">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>{' '}
                          {value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {streetViewAnalysis.mountRecommendation?.type && (
                  <div className="mb-2 rounded bg-white p-2">
                    <div className="text-xs font-medium text-blue-800">Mount Recommendation</div>
                    <div className="text-xs text-gray-700">
                      <span className="font-medium">{streetViewAnalysis.mountRecommendation.type}</span>
                      {streetViewAnalysis.mountRecommendation.reason && (
                        <> — {streetViewAnalysis.mountRecommendation.reason}</>
                      )}
                    </div>
                    {streetViewAnalysis.mountRecommendation.suggestedLocations && (
                      <div className="mt-1 text-xs text-gray-500">
                        {streetViewAnalysis.mountRecommendation.suggestedLocations}
                      </div>
                    )}
                  </div>
                )}

                {streetViewAnalysis.concerns && streetViewAnalysis.concerns.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs font-medium text-amber-700">Concerns</div>
                    <ul className="list-inside list-disc space-y-0.5">
                      {streetViewAnalysis.concerns.map((c, i) => (
                        <li key={i} className="text-xs text-gray-600">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => setStreetViewAnalysis(null)}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

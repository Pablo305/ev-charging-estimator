'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { LineString, Point } from 'geojson';
import type {
  EquipmentType,
  MapAction,
  MapWorkspaceState,
  PointToolType,
  RunType,
} from '@/lib/map/types';
import type { EstimateInput } from '@/lib/estimate/types';
import { mapReducer, initialMapState } from '@/lib/map/workspace-reducer';
import {
  createTakeoffDraftFromEstimate,
  emptyStoredDrawings,
  extractStateFromAddress,
  serializeMapDrawings,
  type TakeoffDraft,
} from '@/lib/map/takeoff';
import { generateEquipmentLabel } from './EquipmentLayer';
import { SiteMap } from './SiteMap';
import { DrawingToolbar } from './DrawingToolbar';
import { AddressSearch } from './AddressSearch';
import { TakeoffSummaryPanel } from './TakeoffSummaryPanel';
import { PlanUploadPanel } from './PlanUploadPanel';

const TAKEOFF_STORAGE_KEY = 'bulletev_takeoff_workspace';

type ToolType = RunType | EquipmentType | PointToolType | null;

interface MapTakeoffWorkspaceProps {
  estimateInput: EstimateInput;
  onAddToEstimate: (mapState: MapWorkspaceState, siteAddress: string, siteState: string) => void;
  onStartNewEstimate: (mapState: MapWorkspaceState, siteAddress: string, siteState: string) => void;
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function MapTakeoffWorkspace({
  estimateInput,
  onAddToEstimate,
  onStartNewEstimate,
}: MapTakeoffWorkspaceProps) {
  const [mapState, dispatch] = useReducer(mapReducer, undefined, initialMapState);
  const [undoStack, setUndoStack] = useState<MapWorkspaceState[]>([]);
  const [siteAddress, setSiteAddress] = useState('');
  const [siteState, setSiteState] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const hydratedRef = useRef(false);
  const saveReadyRef = useRef(false);

  const restoreSnapshot = useCallback((snapshot: TakeoffDraft | MapWorkspaceState) => {
    dispatch({ type: 'RESET' });

    const address = 'siteAddress' in snapshot ? snapshot.siteAddress : '';
    const coordinates = 'siteCoordinates' in snapshot ? snapshot.siteCoordinates : null;

    setSiteAddress(address);
    setSiteState('siteState' in snapshot ? snapshot.siteState : '');

    if (address && coordinates) {
      dispatch({
        type: 'SET_ADDRESS',
        address,
        coordinates,
      });
    }

    const runs = 'drawings' in snapshot ? snapshot.drawings.runs : snapshot.runs;
    const equipment = 'drawings' in snapshot ? snapshot.drawings.equipment : snapshot.equipment;

    for (const run of runs) {
      dispatch({
        type: 'ADD_RUN',
        run: {
          id: run.id,
          runType: run.runType as RunType,
          geometry: run.geometry as LineString,
          lengthFt: run.lengthFt,
          label: run.label,
          createdAt: 'createdAt' in run && typeof run.createdAt === 'string'
            ? run.createdAt
            : new Date().toISOString(),
        },
      });
    }

    for (const item of equipment) {
      dispatch({
        type: 'ADD_EQUIPMENT',
        equipment: {
          id: item.id,
          equipmentType: item.equipmentType as EquipmentType,
          geometry: item.geometry as Point,
          label: item.label,
          properties: {},
        },
      });
    }
  }, []);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    let savedDraft: TakeoffDraft | null = null;
    try {
      const rawDraft = localStorage.getItem(TAKEOFF_STORAGE_KEY);
      if (rawDraft) savedDraft = JSON.parse(rawDraft) as TakeoffDraft;
    } catch {
      savedDraft = null;
    }

    const fallbackDraft = savedDraft ?? createTakeoffDraftFromEstimate(estimateInput);
    if (fallbackDraft) {
      setSiteAddress(fallbackDraft.siteAddress);
      setSiteState(fallbackDraft.siteState || extractStateFromAddress(fallbackDraft.siteAddress));
      restoreSnapshot({
        ...fallbackDraft,
        drawings: fallbackDraft.drawings ?? emptyStoredDrawings(),
      });
    } else {
      setSiteState(estimateInput.site.state);
    }

    saveReadyRef.current = true;
  }, [estimateInput, restoreSnapshot]);

  useEffect(() => {
    const mobileTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    setIsTouchDevice(mobileTouch);
    if (mobileTouch) {
      setLeftPanelOpen(false);
      setRightPanelOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!saveReadyRef.current) return;

    const drawings = serializeMapDrawings(mapState);
    const hasDrawings = drawings.runs.length > 0 || drawings.equipment.length > 0;
    const hasCoordinates = Array.isArray(mapState.siteCoordinates);
    const hasAddress = siteAddress.trim().length > 0;

    if (!hasAddress && !hasCoordinates && !hasDrawings) {
      localStorage.removeItem(TAKEOFF_STORAGE_KEY);
      setLastSavedAt(null);
      return;
    }

    const draft: TakeoffDraft = {
      siteAddress,
      siteState,
      siteCoordinates: mapState.siteCoordinates,
      drawings,
    };

    localStorage.setItem(TAKEOFF_STORAGE_KEY, JSON.stringify(draft));
    setLastSavedAt(
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date()),
    );
  }, [mapState, siteAddress, siteState]);

  useEffect(() => {
    if (!siteAddress || mapState.siteCoordinates) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    const controller = new AbortController();

    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(siteAddress)}.json?access_token=${token}&country=us&limit=1`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then((data) => {
        const center = data.features?.[0]?.center;
        if (!Array.isArray(center) || center.length < 2) return;
        dispatch({
          type: 'SET_ADDRESS',
          address: siteAddress,
          coordinates: [center[0], center[1]] as [number, number],
        });
      })
      .catch(() => {});

    return () => controller.abort();
  }, [mapState.siteCoordinates, siteAddress]);

  const dispatchWithUndo = useCallback((action: MapAction) => {
    setUndoStack((previous) => [...previous.slice(-9), mapState]);
    dispatch(action);
  }, [mapState]);

  const handleUndo = useCallback(() => {
    setUndoStack((previous) => {
      if (previous.length === 0) return previous;
      const last = previous[previous.length - 1];
      restoreSnapshot(last);
      return previous.slice(0, -1);
    });
  }, [restoreSnapshot]);

  const handleClearAll = useCallback(() => {
    setUndoStack((previous) => [...previous.slice(-9), mapState]);
    const preservedAddress = siteAddress;
    const preservedState = siteState;
    const preservedCoordinates = mapState.siteCoordinates;

    dispatch({ type: 'RESET' });
    setSiteAddress(preservedAddress);
    setSiteState(preservedState);

    if (preservedAddress && preservedCoordinates) {
      dispatch({
        type: 'SET_ADDRESS',
        address: preservedAddress,
        coordinates: preservedCoordinates,
      });
    }
  }, [mapState, siteAddress, siteState]);

  const handleResetTakeoff = useCallback(() => {
    const hasContent = siteAddress.trim().length > 0 || mapState.runs.length > 0 || mapState.equipment.length > 0;
    if (hasContent && !window.confirm('Reset this standalone takeoff and remove the saved local draft?')) {
      return;
    }

    localStorage.removeItem(TAKEOFF_STORAGE_KEY);
    setUndoStack([]);
    setSiteAddress('');
    setSiteState('');
    setLastSavedAt(null);
    dispatch({ type: 'RESET' });
  }, [mapState.equipment.length, mapState.runs.length, siteAddress]);

  const handleAddressSelect = useCallback((address: string, coordinates: [number, number]) => {
    const hasDrawings = mapState.runs.length > 0 || mapState.equipment.length > 0;
    if (hasDrawings && !window.confirm('Changing the address will clear the existing takeoff measurements for this site. Continue?')) {
      return;
    }

    setUndoStack([]);
    setSiteAddress(address);
    setSiteState(extractStateFromAddress(address));
    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_ADDRESS', address, coordinates });
  }, [mapState.equipment.length, mapState.runs.length]);

  const handleSelectTool = useCallback((tool: ToolType) => {
    dispatch({ type: 'SELECT_TOOL', tool });
  }, []);

  const handleRunCreate = useCallback((runType: RunType, geometry: LineString, lengthFt: number) => {
    dispatchWithUndo({
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
  }, [dispatchWithUndo]);

  const handleRunUpdate = useCallback((id: string, geometry: LineString, lengthFt: number) => {
    dispatch({ type: 'UPDATE_RUN', id, geometry, lengthFt });
  }, []);

  const handleRunDelete = useCallback((id: string) => {
    dispatchWithUndo({ type: 'DELETE_RUN', id });
  }, [dispatchWithUndo]);

  const handleEquipmentPlace = useCallback((equipmentType: EquipmentType, geometry: Point) => {
    const label = generateEquipmentLabel(
      equipmentType,
      mapState.equipment.filter((equipment) => equipment.equipmentType === equipmentType).length,
    );

    dispatchWithUndo({
      type: 'ADD_EQUIPMENT',
      equipment: {
        id: nextId('eq'),
        equipmentType,
        geometry,
        label,
        properties: {},
      },
    });
  }, [dispatchWithUndo, mapState.equipment]);

  const handleEquipmentUpdate = useCallback((id: string, geometry: Point) => {
    dispatch({ type: 'UPDATE_EQUIPMENT', id, geometry });
  }, []);

  const handleEquipmentDelete = useCallback((id: string) => {
    dispatchWithUndo({ type: 'DELETE_EQUIPMENT', id });
  }, [dispatchWithUndo]);

  const handleFeatureSelect = useCallback((featureId: string | null) => {
    dispatch({ type: 'SELECT_FEATURE', featureId });
  }, []);

  const handlePointToolPlace = useCallback((_: PointToolType, __: [number, number]) => {
    // Standalone takeoff mode does not use point tools.
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if ((event.key !== 'Delete' && event.key !== 'Backspace') || !mapState.selectedFeatureId) return;

      const isRun = mapState.runs.some((run) => run.id === mapState.selectedFeatureId);
      if (isRun) {
        dispatchWithUndo({ type: 'DELETE_RUN', id: mapState.selectedFeatureId });
      } else if (mapState.equipment.some((equipment) => equipment.id === mapState.selectedFeatureId)) {
        dispatchWithUndo({ type: 'DELETE_EQUIPMENT', id: mapState.selectedFeatureId });
      }
      dispatch({ type: 'SELECT_FEATURE', featureId: null });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatchWithUndo, mapState.equipment, mapState.runs, mapState.selectedFeatureId]);

  const totalRunFt = useMemo(
    () => mapState.runs.reduce((sum, run) => sum + run.lengthFt, 0),
    [mapState.runs],
  );

  const activeToolLabel = useMemo(() => {
    if (!mapState.selectedTool) return null;
    return `${mapState.selectedTool.replace(/_/g, ' ')} mode - click to draw, double-click to finish`;
  }, [mapState.selectedTool]);

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex h-[calc(100vh-13rem)] min-h-[720px]">
        <div
          className={`border-r border-gray-200 bg-white transition-all ${
            leftPanelOpen ? 'w-[280px]' : 'w-0 overflow-hidden'
          }`}
        >
          {leftPanelOpen && (
            <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Site Setup</div>
                <p className="mt-1 text-xs text-gray-500">
                  Search the site, then draw only the runs and equipment you need for takeoff.
                </p>
              </div>

              <AddressSearch
                key={siteAddress || 'empty-address'}
                onAddressSelect={handleAddressSelect}
                initialAddress={siteAddress}
              />

              {mapState.siteCoordinates && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Coordinates</div>
                  <div className="mt-1">
                    {mapState.siteCoordinates[1].toFixed(6)}, {mapState.siteCoordinates[0].toFixed(6)}
                  </div>
                </div>
              )}

              {!siteAddress && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                  <div className="text-sm font-medium text-gray-700">Start with the address</div>
                  <p className="mt-1 text-xs text-gray-500">
                    Measurements stay in this standalone takeoff until you choose to transfer them.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Runs" value={String(mapState.runs.length)} />
                <MiniStat label="Equipment" value={String(mapState.equipment.length)} />
                <MiniStat label="Footage" value={`${Math.round(totalRunFt)} ft`} />
                <MiniStat label="Undo" value={`${undoStack.length} saved`} />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-900">Common Shortcuts</div>
                <div className="mt-3 space-y-2 text-xs text-gray-600">
                  <ShortcutRow shortcut="C" label="Conduit" />
                  <ShortcutRow shortcut="F" label="Feeder" />
                  <ShortcutRow shortcut="T" label="Trench" />
                  <ShortcutRow shortcut="B" label="Bore" />
                  <ShortcutRow shortcut="P" label="Panel" />
                  <ShortcutRow shortcut="Delete" label="Remove selected item" />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <PlanUploadPanel
                  siteCoordinates={mapState.siteCoordinates}
                  onApply={(runs, equipment) => {
                    dispatchWithUndo({ type: 'LOAD_AI_RUNS', runs, equipment });
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="relative flex-1 bg-gray-950">
          <div className="absolute left-2 top-2 z-10 flex gap-2">
            <button
              type="button"
              onClick={() => setLeftPanelOpen((value) => !value)}
              className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-gray-50"
              title="Toggle site panel"
            >
              {leftPanelOpen ? 'Hide site' : 'Show site'}
            </button>
            <button
              type="button"
              onClick={() => setRightPanelOpen((value) => !value)}
              className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-gray-50"
              title="Toggle summary panel"
            >
              {rightPanelOpen ? 'Hide summary' : 'Show summary'}
            </button>
          </div>

          <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs font-medium text-gray-700 shadow backdrop-blur">
            Standalone takeoff mode - nothing updates the estimate until you choose it.
          </div>

          <div className="absolute left-2 top-14 z-10 flex flex-col gap-2">
            {isTouchDevice ? (
              <div className="rounded-lg bg-white/90 px-3 py-2 text-xs text-gray-600 shadow backdrop-blur">
                Use a desktop browser for precise map drawing.
              </div>
            ) : (
              <DrawingToolbar
                selectedTool={mapState.selectedTool}
                onSelectTool={handleSelectTool}
                onClearAll={handleClearAll}
                onUndo={handleUndo}
              />
            )}
          </div>

          {activeToolLabel && (
            <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
              {activeToolLabel}
            </div>
          )}

          <SiteMap
            siteCoordinates={mapState.siteCoordinates}
            runs={mapState.runs}
            equipment={mapState.equipment}
            selectedTool={mapState.selectedTool}
            selectedFeatureId={mapState.selectedFeatureId}
            powerSourceLocation={null}
            chargerZones={[]}
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

        <div
          className={`border-l border-gray-200 bg-gray-50 transition-all ${
            rightPanelOpen ? 'w-[360px]' : 'w-0 overflow-hidden'
          }`}
        >
          {rightPanelOpen && (
            <TakeoffSummaryPanel
              siteAddress={siteAddress}
              siteCoordinates={mapState.siteCoordinates}
              runs={mapState.runs}
              equipment={mapState.equipment}
              lastSavedAt={lastSavedAt}
              onAddToEstimate={() => onAddToEstimate(mapState, siteAddress, siteState)}
              onStartNewEstimate={() => onStartNewEstimate(mapState, siteAddress, siteState)}
              onResetTakeoff={handleResetTakeoff}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function ShortcutRow({ shortcut, label }: { shortcut: string; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
      <span className="text-gray-600">{label}</span>
      <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">
        {shortcut}
      </kbd>
    </div>
  );
}

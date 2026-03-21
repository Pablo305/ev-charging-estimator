'use client';

import { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import type { EstimateInput, EstimateOutput } from '@/lib/estimate/types';
import type {
  MapWorkspaceState,
  MapAction,
  RunType,
  EquipmentType,
  PointToolType,
  PatchBatch,
  EstimatePatch,
} from '@/lib/map/types';
import type { SiteIntelligence, AssessmentPhase } from '@/lib/ai/site-assessment-types';
import { PATCH_DEBOUNCE_MS } from '@/lib/map/constants';
import { measureRunLength } from '@/lib/map/measurements';
import { generatePatches, applyPatches } from '@/lib/map/sync';
import { generateAIPatches } from '@/lib/map/ai-patches';
import { generateInferencePatches } from '@/lib/map/auto-infer';
import { autoGenerateRuns } from '@/lib/map/auto-generate-runs';
import { generateEquipmentLabel } from './EquipmentLayer';
import { SiteMap } from './SiteMap';
import { StreetViewPanel } from './StreetViewPanel';
import { DrawingToolbar } from './DrawingToolbar';
import { SiteInfoPanel } from './SiteInfoPanel';
import { PatchReviewPanel } from './PatchReviewPanel';
import { EstimateImpactPanel } from './EstimateImpactPanel';
import { SiteAssessmentFlow } from './SiteAssessmentFlow';
import { SiteIntelligenceCard } from './SiteIntelligenceCard';
import { SmartQuestionnaire } from './SmartQuestionnaire';
import type { LineString, Point } from 'geojson';

// ── Module-level constants ──

const ALLOWED_SV_FIELDS = new Set([
  'parkingEnvironment.surfaceType',
  'parkingEnvironment.type',
  'charger.mountType',
  'parkingEnvironment.trafficControlRequired',
]);

const ALLOWED_QA_FIELDS = new Set([
  'charger.brand', 'charger.count', 'charger.chargingLevel',
  'parkingEnvironment.hasPTSlab', 'site.siteType',
]);

// ── Reducer ──

function initialState(): MapWorkspaceState {
  return {
    siteAddress: '',
    siteCoordinates: null,
    runs: [],
    equipment: [],
    selectedTool: null,
    selectedFeatureId: null,
    powerSourceLocation: null,
    chargerZones: [],
  };
}

function mapReducer(state: MapWorkspaceState, action: MapAction): MapWorkspaceState {
  switch (action.type) {
    case 'SET_ADDRESS':
      return {
        ...state,
        siteAddress: action.address,
        siteCoordinates: action.coordinates,
        // Reset AI state so a new assessment can trigger for the new address
        powerSourceLocation: null,
        chargerZones: [],
      };

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

    case 'SET_POWER_SOURCE':
      return { ...state, powerSourceLocation: action.coordinates };

    case 'SET_CHARGER_ZONE':
      return { ...state, chargerZones: [...state.chargerZones, action.coordinates] };

    case 'LOAD_AI_RUNS': {
      // Remove previous auto-generated runs/equipment (IDs contain '-auto-') before adding new ones
      const manualRuns = state.runs.filter((r) => !r.id.includes('-auto-'));
      const manualEquipment = state.equipment.filter((e) => !e.id.includes('-auto-'));
      return {
        ...state,
        runs: [...manualRuns, ...action.runs],
        equipment: [...manualEquipment, ...action.equipment],
      };
    }

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

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  const [, setUndoStack] = useState<MapWorkspaceState[]>([]);

  const dispatchWithUndo = useCallback((action: MapAction) => {
    setUndoStack((prev) => [...prev.slice(-9), mapState]);
    dispatch(action);
  }, [mapState]);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      dispatch({ type: 'RESET' });
      if (last.siteAddress && last.siteCoordinates) {
        dispatch({
          type: 'SET_ADDRESS',
          address: last.siteAddress,
          coordinates: last.siteCoordinates,
        });
      }
      if (last.powerSourceLocation) {
        dispatch({ type: 'SET_POWER_SOURCE', coordinates: last.powerSourceLocation });
      }
      for (const z of last.chargerZones) {
        dispatch({ type: 'SET_CHARGER_ZONE', coordinates: z });
      }
      for (const run of last.runs) {
        dispatch({ type: 'ADD_RUN', run });
      }
      for (const eq of last.equipment) {
        dispatch({ type: 'ADD_EQUIPMENT', equipment: eq });
      }
      dispatch({ type: 'SELECT_TOOL', tool: last.selectedTool });
      dispatch({ type: 'SELECT_FEATURE', featureId: last.selectedFeatureId });
      return prev.slice(0, -1);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-9), mapState]);
    dispatch({ type: 'RESET' });
  }, [mapState]);

  const [patchBatch, setPatchBatch] = useState<PatchBatch | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [centerView, setCenterView] = useState<CenterView>('satellite');
  const [isAnalyzingStreetView, setIsAnalyzingStreetView] = useState(false);
  const [streetViewAnalysis, setStreetViewAnalysis] = useState<StreetViewAnalysisResult | null>(null);
  const [assessmentPhase, setAssessmentPhase] = useState<AssessmentPhase>('idle');
  const [siteIntelligence, setSiteIntelligence] = useState<SiteIntelligence | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assessmentGenerationRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef(input);

  // Detect mobile touch-only device (not desktop with touchscreen)
  useEffect(() => {
    const isMobileTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    setIsTouchDevice(isMobileTouch);
    if (isMobileTouch) {
      setLeftPanelOpen(false);
      setRightPanelOpen(false);
    }
  }, []);

  // Keep inputRef current for async callbacks
  useEffect(() => { inputRef.current = input; }, [input]);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Show a toast notification that auto-dismisses
  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

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
          const center = data.features?.[0]?.center;
          if (Array.isArray(center) && center.length >= 2) {
            dispatch({
              type: 'SET_ADDRESS',
              address: input.site.address,
              coordinates: [center[0], center[1]] as [number, number],
            });
          }
        })
        .catch(() => {});
    }
  }, [input.site.address, mapState.siteAddress]);

  // Debounced patch generation — merges map patches with existing AI/questionnaire patches
  // Uses inputRef.current to avoid re-triggering when patches are applied
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const currentInput = inputRef.current;
      const batch = generatePatches(mapState, currentInput);
      const inferPatches = generateInferencePatches(currentInput, mapState);
      setPatchBatch((prev) => {
        // Preserve AI analysis patches; auto_infer patches are recomputed each cycle
        const preservedPatches = (prev?.patches ?? []).filter(
          (p) => p.source === 'ai_analysis',
        );
        // Deduplicate: AI analysis patches take priority over auto_infer for same fieldPath
        const aiFieldPaths = new Set(preservedPatches.map((p) => p.fieldPath));
        const mapFieldPaths = new Set(batch.patches.map((p) => p.fieldPath));
        const dedupedInferPatches = inferPatches.filter(
          (p) => !aiFieldPaths.has(p.fieldPath) && !mapFieldPaths.has(p.fieldPath),
        );
        const allPatches = [...preservedPatches, ...batch.patches, ...dedupedInferPatches];
        if (allPatches.length === 0) return null;
        return {
          batchId: batch.batchId,
          trigger: batch.trigger,
          patches: allPatches,
          createdAt: batch.createdAt,
        };
      });
    }, PATCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapState]);

  // ── Callbacks ──

  const performAddressChange = useCallback(
    (address: string, coordinates: [number, number]) => {
      dispatch({ type: 'SET_ADDRESS', address, coordinates });
      assessmentGenerationRef.current += 1;
      setAssessmentPhase('idle');
      setSiteIntelligence(null);
      setStreetViewAnalysis(null);
      setShowQuestionnaire(false);
      setPatchBatch(null);
    },
    [],
  );

  const handleAddressSelect = useCallback(
    (address: string, coordinates: [number, number]) => {
      // Warn if user has existing drawings that will be lost
      const hasDrawings = mapState.runs.length > 0 || mapState.equipment.length > 0;
      if (hasDrawings) {
        setConfirmDialog({
          message: `Changing the address will clear ${mapState.runs.length} run(s) and ${mapState.equipment.length} equipment marker(s). Continue?`,
          onConfirm: () => {
            performAddressChange(address, coordinates);
            setConfirmDialog(null);
          },
        });
      } else {
        performAddressChange(address, coordinates);
      }
    },
    [mapState.runs.length, mapState.equipment.length, performAddressChange],
  );

  const handleSelectTool = useCallback(
    (tool: RunType | EquipmentType | PointToolType | null) => {
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
      dispatchWithUndo({ type: 'DELETE_RUN', id });
    },
    [dispatchWithUndo],
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
      dispatchWithUndo({ type: 'DELETE_EQUIPMENT', id });
    },
    [dispatchWithUndo],
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
      setPatchBatch((prev) => {
        if (!prev) return prev;
        const updated: PatchBatch = {
          ...prev,
          patches: prev.patches.map((p) =>
            p.id === patchId ? { ...p, status } : p,
          ),
        };
        // If all patches resolved, apply accepted ones
        if (updated.patches.every((p) => p.status !== 'pending')) {
          const newInput = applyPatches(inputRef.current, updated.patches);
          onInputChange(newInput);
        }
        return updated;
      });
    },
    [onInputChange],
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
    setPatchBatch((prev) => {
      if (!prev) return prev;
      const updated: PatchBatch = {
        ...prev,
        patches: prev.patches.map((p) =>
          p.status === 'pending' ? { ...p, status: 'accepted' as const } : p,
        ),
      };
      onInputChange(applyPatches(inputRef.current, updated.patches));
      return updated;
    });
  }, [onInputChange]);

  const handleRejectAll = useCallback(() => {
    setPatchBatch((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        patches: prev.patches.map((p) =>
          p.status === 'pending' ? { ...p, status: 'rejected' as const } : p,
        ),
      };
    });
  }, []);

  // Accept specific patch IDs atomically (for "Accept Safe" button)
  const handleAcceptSafe = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setPatchBatch((prev) => {
      if (!prev) return prev;
      const updated: PatchBatch = {
        ...prev,
        patches: prev.patches.map((p) =>
          idSet.has(p.id) && p.status === 'pending'
            ? { ...p, status: 'accepted' as const }
            : p,
        ),
      };
      if (updated.patches.every((p) => p.status !== 'pending')) {
        onInputChange(applyPatches(inputRef.current, updated.patches));
      }
      return updated;
    });
  }, [onInputChange]);

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
        const analysis = data.analysis as StreetViewAnalysisResult;
        setStreetViewAnalysis(analysis);

        // Convert street view inferred fields into patches
        if (analysis.inferredFields) {
          const svPatches: EstimatePatch[] = [];
          let counter = 0;
          for (const [fieldPath, value] of Object.entries(analysis.inferredFields)) {
            if (!ALLOWED_SV_FIELDS.has(fieldPath)) continue;
            if (value === null || value === undefined) continue;
            counter += 1;
            svPatches.push({
              id: `sv-patch-${Date.now()}-${counter}`,
              fieldPath,
              previousValue: null,
              proposedValue: value,
              source: 'ai_analysis',
              reason: `Street View AI analysis (${Math.round((analysis.confidence ?? 0.5) * 100)}% confidence)`,
              status: 'pending',
            });
          }
          if (svPatches.length > 0) {
            setPatchBatch((prev) => {
              if (!prev) {
                return {
                  batchId: `sv-batch-${Date.now()}`,
                  trigger: 'streetview_analysis',
                  patches: svPatches,
                  createdAt: new Date().toISOString(),
                };
              }
              return { ...prev, patches: [...prev.patches, ...svPatches] };
            });
          }
        }
      }
    } catch (err) {
      console.error('Street View analysis error:', err);
    } finally {
      setIsAnalyzingStreetView(false);
    }
  }, []);

  // ── AI Site Assessment ──

  const triggerAssessment = useCallback(async (lat: number, lng: number) => {
    const generation = ++assessmentGenerationRef.current;
    setAssessmentPhase('analyzing_satellite');
    setSiteIntelligence(null);

    try {
      const res = await fetch('/api/ai/assess-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });

      // Discard stale response if address changed while fetching
      if (assessmentGenerationRef.current !== generation) return;

      if (!res.ok) {
        console.error('Site assessment failed:', await res.json().catch(() => ({})));
        setAssessmentPhase('idle');
        return;
      }

      const data = await res.json();

      // Check again after parsing — address may have changed
      if (assessmentGenerationRef.current !== generation) return;

      if (data.siteIntelligence) {
        const intel = data.siteIntelligence as SiteIntelligence;
        setSiteIntelligence(intel);
        setAssessmentPhase('awaiting_user_input');
        showToast(`AI found ${intel.mergedInferences.length} site characteristics (${Math.round(intel.overallConfidence * 100)}% confidence)`);

        // Auto-generate AI patches (use inputRef for fresh input)
        const aiBatch = generateAIPatches(intel, inputRef.current);
        if (aiBatch.patches.length > 0) {
          setPatchBatch((prev) => {
            if (!prev) return aiBatch;
            return {
              ...prev,
              patches: [...prev.patches, ...aiBatch.patches],
            };
          });
        }

        // Show questionnaire if there are unanswered questions
        if (intel.unansweredQuestions.length > 0) {
          setShowQuestionnaire(true);
        }
      }
    } catch (err) {
      // Only update phase if this is still the current assessment
      if (assessmentGenerationRef.current === generation) {
        console.error('Site assessment error:', err);
        setAssessmentPhase('idle');
      }
    }
  }, [showToast]);

  // Auto-trigger assessment when coordinates are set
  useEffect(() => {
    if (mapState.siteCoordinates && assessmentPhase === 'idle') {
      const [lng, lat] = mapState.siteCoordinates;
      triggerAssessment(lat, lng);
    }
    // Only trigger on coordinate changes, not phase changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapState.siteCoordinates]);

  // Allowed field paths for questionnaire answers

  // Handle questionnaire answers — route through patch review panel
  const handleQuestionAnswer = useCallback(
    (fieldPath: string, value: unknown) => {
      // Only allow known field paths
      if (!ALLOWED_QA_FIELDS.has(fieldPath)) return;

      // Validate number bounds
      if (typeof value === 'number') {
        if (!Number.isFinite(value) || value < 0 || value > 500) return;
      }

      const patch: EstimatePatch = {
        id: `qa-patch-${Date.now()}`,
        fieldPath,
        previousValue: null,
        proposedValue: value,
        source: 'ai_analysis',
        reason: 'User confirmed via Smart Questionnaire',
        status: 'pending',
      };

      setPatchBatch((prev) => {
        if (!prev) {
          return {
            batchId: `qa-batch-${Date.now()}`,
            trigger: 'questionnaire_answer',
            patches: [patch],
            createdAt: new Date().toISOString(),
          };
        }
        return { ...prev, patches: [...prev.patches, patch] };
      });
    },
    [],
  );

  const handleQuestionnaireComplete = useCallback(() => {
    setShowQuestionnaire(false);
    setAssessmentPhase('generating_runs');
    // Prompt user to mark power source and charger zones
    dispatch({ type: 'SELECT_TOOL', tool: 'power_source' });
  }, []);

  // Handle power source / charger zone placement
  const handlePointToolPlace = useCallback(
    (toolType: PointToolType, coordinates: [number, number]) => {
      if (toolType === 'power_source') {
        dispatch({ type: 'SET_POWER_SOURCE', coordinates });
        // Switch to charger zone tool after placing power source
        dispatch({ type: 'SELECT_TOOL', tool: 'charger_zone' });
      } else if (toolType === 'charger_zone') {
        dispatch({ type: 'SET_CHARGER_ZONE', coordinates });
      }
    },
    [],
  );

  // Auto-generate runs when power source + at least one charger zone are set
  useEffect(() => {
    if (!mapState.powerSourceLocation || mapState.chargerZones.length === 0) return;

    // Determine surface from AI analysis
    const surfaceInference = siteIntelligence?.mergedInferences.find(
      (m) => m.fieldPath === 'parkingEnvironment.surfaceType',
    );
    const primarySurface = (surfaceInference?.value as string) ?? null;

    // Determine charging level from input
    const chargingLevel = input.charger?.chargingLevel ?? 'l2';

    const plgRaw = siteIntelligence?.satelliteAnalysis?.parkingLayoutGeometry;
    const plgObj = typeof plgRaw === 'object' && plgRaw !== null ? plgRaw as Record<string, unknown> : null;
    const surfaceTransitions = Array.isArray(plgObj?.surfaceTransitions)
      ? plgObj.surfaceTransitions.filter((s): s is string => typeof s === 'string')
      : [];

    const result = autoGenerateRuns(
      mapState.powerSourceLocation,
      mapState.chargerZones,
      {
        primarySurface: primarySurface as 'asphalt' | 'concrete' | 'gravel' | 'other' | null,
        surfaceTransitions,
      },
      chargingLevel as 'l2' | 'l3_dcfc',
    );

    dispatch({ type: 'LOAD_AI_RUNS', runs: result.runs, equipment: result.equipment });
    setAssessmentPhase('complete');
    dispatch({ type: 'SELECT_TOOL', tool: null });
    showToast(`Auto-generated ${result.runs.length} runs + ${result.equipment.length} equipment markers`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapState.powerSourceLocation, mapState.chargerZones.length]);

  // ── Delete selected feature ──

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (!mapState.selectedFeatureId) return;

        const isRun = mapState.runs.some((r) => r.id === mapState.selectedFeatureId);
        if (isRun) {
          dispatchWithUndo({ type: 'DELETE_RUN', id: mapState.selectedFeatureId });
        } else if (mapState.equipment.some((e) => e.id === mapState.selectedFeatureId)) {
          dispatchWithUndo({ type: 'DELETE_EQUIPMENT', id: mapState.selectedFeatureId });
        }
        dispatch({ type: 'SELECT_FEATURE', featureId: null });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mapState.selectedFeatureId,
    mapState.runs,
    mapState.equipment,
    dispatchWithUndo,
  ]);

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

        {/* Assessment flow stepper */}
        {assessmentPhase !== 'idle' && (
          <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2">
            <SiteAssessmentFlow phase={assessmentPhase} />
          </div>
        )}

        {/* View toggle (satellite / street view) — below stepper when active */}
        <div className={`absolute left-1/2 z-10 -translate-x-1/2 ${assessmentPhase !== 'idle' ? 'top-14' : 'top-2'}`}>
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
            {/* Floating toolbar — disabled on touch devices */}
            <div className="absolute left-2 top-12 z-10">
              {isTouchDevice ? (
                <div className="rounded-lg bg-white/90 px-3 py-2 text-xs text-gray-500 shadow-md backdrop-blur">
                  Use desktop for drawing tools
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

            {/* Active tool indicator */}
            {mapState.selectedTool && (
              <div className={`absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg ${
                mapState.selectedTool === 'power_source' ? 'bg-red-600'
                : mapState.selectedTool === 'charger_zone' ? 'bg-blue-600'
                : 'bg-blue-600'
              }`}>
                {mapState.selectedTool === 'power_source'
                  ? 'Click where the electrical panel / power source is'
                  : mapState.selectedTool === 'charger_zone'
                  ? `Click where chargers go (${mapState.chargerZones.length} placed) — double-click when done`
                  : `${mapState.selectedTool.replace('_', ' ')} mode — Click to draw, double-click to finish`
                }
              </div>
            )}

            <SiteMap
              siteCoordinates={mapState.siteCoordinates}
              runs={mapState.runs}
              equipment={mapState.equipment}
              selectedTool={mapState.selectedTool}
              selectedFeatureId={mapState.selectedFeatureId}
              powerSourceLocation={mapState.powerSourceLocation}
              chargerZones={mapState.chargerZones}
              onRunCreate={handleRunCreate}
              onRunUpdate={handleRunUpdate}
              onRunDelete={handleRunDelete}
              onEquipmentPlace={handleEquipmentPlace}
              onEquipmentUpdate={handleEquipmentUpdate}
              onEquipmentDelete={handleEquipmentDelete}
              onFeatureSelect={handleFeatureSelect}
              onPointToolPlace={handlePointToolPlace}
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

            {/* AI Site Intelligence */}
            {siteIntelligence && (
              <SiteIntelligenceCard
                intelligence={siteIntelligence}
                onSuggestPowerSource={() => {
                  dispatch({ type: 'SELECT_TOOL', tool: 'power_source' });
                  showToast('Click the map to place the power source');
                }}
                onSuggestChargerZones={() => {
                  dispatch({ type: 'SELECT_TOOL', tool: 'charger_zone' });
                  showToast('Click the map to place charger zones');
                }}
              />
            )}

            {/* Point tool controls */}
            {assessmentPhase === 'generating_runs' && !mapState.powerSourceLocation && (
              <button
                onClick={() => dispatch({ type: 'SELECT_TOOL', tool: 'power_source' })}
                className="w-full rounded-lg bg-red-50 p-3 text-left text-sm text-red-800 hover:bg-red-100"
              >
                Click &quot;Power Source&quot; then click the map to mark the electrical panel location
              </button>
            )}
            {assessmentPhase === 'generating_runs' && mapState.powerSourceLocation && mapState.chargerZones.length === 0 && (
              <button
                onClick={() => dispatch({ type: 'SELECT_TOOL', tool: 'charger_zone' })}
                className="w-full rounded-lg bg-blue-50 p-3 text-left text-sm text-blue-800 hover:bg-blue-100"
              >
                Now click the map to mark where chargers should go
              </button>
            )}

            <PatchReviewPanel
              batch={patchBatch}
              onAcceptPatch={handleAcceptPatch}
              onRejectPatch={handleRejectPatch}
              onAcceptAll={handleAcceptAll}
              onRejectAll={handleRejectAll}
              onAcceptSafe={handleAcceptSafe}
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

      {/* Smart Questionnaire Modal */}
      {showQuestionnaire && siteIntelligence && (
        <SmartQuestionnaire
          questions={siteIntelligence.unansweredQuestions}
          onAnswer={handleQuestionAnswer}
          onComplete={handleQuestionnaireComplete}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          onKeyDown={(e) => { if (e.key === 'Escape') setConfirmDialog(null); }}
        >
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <div id="confirm-dialog-title" className="mb-1 text-sm font-semibold text-gray-900">Confirm Address Change</div>
            <p className="mb-4 text-sm text-gray-600">{confirmDialog.message}</p>
            <div className="flex gap-2">
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
              >
                Clear & Continue
              </button>
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-[slideUp_0.3s_ease-out]">
          <div className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

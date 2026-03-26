'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { EstimateInput } from '@/lib/estimate/types';
import {
  buildSmartEstimate,
  type SmartEstimateInput,
  type SmartEstimateResult,
} from '@/lib/estimate/smart-estimate';

// ── Helpers ──

/**
 * Check whether the estimate input has enough map placement data
 * to trigger the smart estimate engine.
 */
function hasRequiredPlacements(input: EstimateInput): boolean {
  const ws = input.mapWorkspace;
  if (!ws) return false;

  const hasAddress = input.site.address.trim().length > 0;
  const hasCoordinates = Array.isArray(ws.siteCoordinates) && ws.siteCoordinates.length === 2;

  // Check for equipment placements — need at least panel + charger
  const drawings = ws.drawings;
  if (!drawings) return false;

  const hasPanelEquipment = drawings.equipment?.some(
    (e) => e.equipmentType === 'panel' || e.equipmentType === 'meter_room',
  ) ?? false;

  const hasChargerEquipment = drawings.equipment?.some(
    (e) => e.equipmentType === 'charger_l2' || e.equipmentType === 'charger_l3',
  ) ?? false;

  return hasAddress && hasCoordinates && hasPanelEquipment && hasChargerEquipment;
}

/**
 * Build SmartEstimateInput from the current EstimateInput's map workspace.
 */
function buildSmartInput(input: EstimateInput): SmartEstimateInput | null {
  const ws = input.mapWorkspace;
  if (!ws?.siteCoordinates || !ws.drawings) return null;

  const drawings = ws.drawings;

  // Find panel location
  const panelEq = drawings.equipment?.find(
    (e) => e.equipmentType === 'panel' || e.equipmentType === 'meter_room',
  );
  if (!panelEq) return null;

  const panelCoords = panelEq.geometry?.coordinates;
  if (!Array.isArray(panelCoords) || panelCoords.length < 2) return null;

  // Find charger placements
  const chargerEquipment = (drawings.equipment ?? []).filter(
    (e) => e.equipmentType === 'charger_l2' || e.equipmentType === 'charger_l3',
  );
  if (chargerEquipment.length === 0) return null;

  const chargerPlacements = chargerEquipment
    .map((e) => {
      const coords = e.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return null;
      return {
        coordinates: [coords[0], coords[1]] as [number, number],
        type: (e.equipmentType === 'charger_l3' ? 'l3' : 'l2') as 'l2' | 'l3',
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (chargerPlacements.length === 0) return null;

  return {
    address: input.site.address,
    siteCoordinates: ws.siteCoordinates,
    panelLocation: [panelCoords[0], panelCoords[1]] as [number, number],
    chargerPlacements,
    siteAssessment: input.site.siteType
      ? {
          siteType: input.site.siteType,
          parkingType: input.parkingEnvironment.type ?? undefined,
          surfaceType: input.parkingEnvironment.surfaceType ?? undefined,
          mountType: input.charger.mountType ?? undefined,
          hasPTSlab: input.parkingEnvironment.hasPTSlab ?? undefined,
          confidence: 0.7,
        }
      : undefined,
  };
}

// ── Hook ──

export interface UseSmartEstimateOptions {
  readonly input: EstimateInput;
  readonly onInputChange: (newInput: EstimateInput) => void;
}

export interface UseSmartEstimateReturn {
  readonly isReady: boolean;
  readonly smartResult: SmartEstimateResult | null;
  readonly isProcessing: boolean;
  readonly applySmartEstimate: () => void;
}

export function useSmartEstimate({
  input,
  onInputChange,
}: UseSmartEstimateOptions): UseSmartEstimateReturn {
  const [smartResult, setSmartResult] = useState<SmartEstimateResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef(input);

  // Keep inputRef current
  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  // Determine readiness
  const isReady = useMemo(() => hasRequiredPlacements(input), [input]);

  // Build smart estimate when conditions are met
  useEffect(() => {
    if (!isReady) {
      setSmartResult(null);
      return;
    }

    setIsProcessing(true);

    // Use a microtask to avoid blocking render
    const timer = setTimeout(() => {
      const smartInput = buildSmartInput(input);
      if (smartInput) {
        try {
          const result = buildSmartEstimate(smartInput);
          setSmartResult(result);
        } catch (err) {
          console.error('Smart estimate build failed:', err);
          setSmartResult(null);
        }
      } else {
        setSmartResult(null);
      }
      setIsProcessing(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [isReady, input]);

  // Apply the smart estimate to the estimate context
  const applySmartEstimate = useCallback(() => {
    if (!smartResult) return;

    // Merge smart result with existing input to preserve customer/project fields
    const current = inputRef.current;
    const merged: EstimateInput = {
      ...smartResult.input,
      project: {
        ...smartResult.input.project,
        name: current.project.name || smartResult.input.project.name,
        salesRep: current.project.salesRep || smartResult.input.project.salesRep,
        timeline: current.project.timeline || smartResult.input.project.timeline,
      },
      customer: {
        ...current.customer,
      },
      notes: current.notes || smartResult.input.notes,
      mapWorkspace: {
        conduitDistance_ft: smartResult.input.mapWorkspace?.conduitDistance_ft ?? null,
        feederDistance_ft: smartResult.input.mapWorkspace?.feederDistance_ft ?? null,
        trenchingDistance_ft: smartResult.input.mapWorkspace?.trenchingDistance_ft ?? null,
        boringDistance_ft: smartResult.input.mapWorkspace?.boringDistance_ft ?? null,
        concreteCuttingDistance_ft: smartResult.input.mapWorkspace?.concreteCuttingDistance_ft ?? null,
        chargerCountFromMap: smartResult.input.mapWorkspace?.chargerCountFromMap ?? null,
        siteCoordinates: smartResult.input.mapWorkspace?.siteCoordinates ?? null,
        pvcConduitDistance_ft: smartResult.input.mapWorkspace?.pvcConduitDistance_ft ?? null,
        cableTrayDistance_ft: smartResult.input.mapWorkspace?.cableTrayDistance_ft ?? null,
        concretePadCount: smartResult.input.mapWorkspace?.concretePadCount ?? null,
        hasPanelPlaced: smartResult.input.mapWorkspace?.hasPanelPlaced ?? null,
        lightingCount: smartResult.input.mapWorkspace?.lightingCount ?? null,
        // Preserve existing drawings and snapshot
        drawings: current.mapWorkspace?.drawings ?? smartResult.input.mapWorkspace?.drawings,
        mapSnapshotDataUrl: current.mapWorkspace?.mapSnapshotDataUrl,
      },
    };

    onInputChange(merged);
  }, [smartResult, onInputChange]);

  return {
    isReady,
    smartResult,
    isProcessing,
    applySmartEstimate,
  };
}

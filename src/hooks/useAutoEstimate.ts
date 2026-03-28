'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { EstimateInput, EstimateOutput } from '@/lib/estimate/types';
import { generateEstimate } from '@/lib/estimate/engine';
import { useEstimate } from '@/contexts/EstimateContext';

const DEBOUNCE_MS = 500;
const MIN_COMPLETENESS = 30;

function getInputCompleteness(input: EstimateInput): number {
  if (input.rawLineItems && input.rawLineItems.length >= 3) {
    return Math.max(85, getInputCompletenessFields(input));
  }
  return getInputCompletenessFields(input);
}

function getInputCompletenessFields(input: EstimateInput): number {
  const criticalFields = [
    input.project.name, input.project.projectType, input.customer.companyName,
    input.site.address, input.site.state, input.charger.brand,
    input.charger.chargingLevel, input.charger.model,
  ];
  const numericFields = [input.charger.count];
  let filled = 0;
  const total = criticalFields.length + numericFields.length;
  for (const f of criticalFields) {
    if (typeof f === 'string' && f.trim().length > 0) filled++;
  }
  for (const f of numericFields) {
    if (typeof f === 'number' && f > 0) filled++;
  }
  return Math.round((filled / total) * 100);
}


export interface AutoEstimateResult {
  readonly estimate: EstimateOutput | null;
  readonly isGenerating: boolean;
  readonly lastGeneratedAt: string | null;
  readonly inputCompleteness: number;
  readonly previousTotal: number | null;
}

export function useAutoEstimate(): AutoEstimateResult {
  const { input } = useEstimate();
  const [estimate, setEstimate] = useState<EstimateOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const previousTotalRef = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputCompleteness = useMemo(() => getInputCompleteness(input), [input]);

  // Track previous total synchronously when estimate changes
  useEffect(() => {
    if (estimate) {
      previousTotalRef.current = estimate.summary.total;
    }
  }, [estimate]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (inputCompleteness < MIN_COMPLETENESS) {
      setEstimate(null);
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);

    debounceRef.current = setTimeout(() => {
      try {
        const result = generateEstimate(input);
        setEstimate(result);
        setLastGeneratedAt(new Date().toISOString());
      } catch {
        // Generation failed — keep previous estimate
      } finally {
        setIsGenerating(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, inputCompleteness]);

  return {
    estimate,
    isGenerating,
    lastGeneratedAt,
    inputCompleteness,
    previousTotal: previousTotalRef.current,
  };
}

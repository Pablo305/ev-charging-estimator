'use client';

import { useState, useEffect } from 'react';
import type { AssessmentPhase } from '@/lib/ai/site-assessment-types';

interface SiteAssessmentFlowProps {
  phase: AssessmentPhase;
}

const PHASE_STEPS: { phase: AssessmentPhase; label: string; icon: string }[] = [
  { phase: 'geocoding', label: 'Address', icon: '📍' },
  { phase: 'analyzing_satellite', label: 'AI Analysis', icon: '🛰️' },
  { phase: 'awaiting_user_input', label: 'Review', icon: '👁️' },
  { phase: 'generating_runs', label: 'Design', icon: '⚡' },
  { phase: 'complete', label: 'Estimate', icon: '✅' },
];

function phaseIndex(phase: AssessmentPhase): number {
  if (phase === 'idle') return -1;
  if (phase === 'analyzing_streetview' || phase === 'merging') return 1;
  const idx = PHASE_STEPS.findIndex((s) => s.phase === phase);
  return idx >= 0 ? idx : -1;
}

function subPhaseLabel(phase: AssessmentPhase): string {
  switch (phase) {
    case 'analyzing_satellite': return 'Analyzing satellite imagery';
    case 'analyzing_streetview': return 'Analyzing street view';
    case 'merging': return 'Merging findings';
    default: return '';
  }
}

export function SiteAssessmentFlow({ phase }: SiteAssessmentFlowProps) {
  const currentIdx = phaseIndex(phase);
  const isAnalyzing = phase === 'analyzing_satellite' || phase === 'analyzing_streetview' || phase === 'merging';
  const [elapsed, setElapsed] = useState(0);

  // Timer for analysis phase — depend on phase directly to avoid reset on re-render
  useEffect(() => {
    const analyzing = phase === 'analyzing_satellite' || phase === 'analyzing_streetview' || phase === 'merging';
    if (analyzing) {
      setElapsed(0);
      const id = setInterval(() => setElapsed((v) => v + 1), 1000);
      return () => clearInterval(id);
    }
    setElapsed(0);
  }, [phase]);

  return (
    <div className="rounded-xl bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-sm ring-1 ring-black/5">
      {/* Step indicators */}
      <div className="flex items-center gap-0.5">
        {PHASE_STEPS.map((step, i) => {
          const isActive = i === currentIdx;
          const isComplete = i < currentIdx;
          const isFuture = i > currentIdx;

          return (
            <div key={step.phase} className="flex items-center">
              {i > 0 && (
                <div
                  className={`mx-1 h-0.5 transition-all duration-500 ${
                    isComplete ? 'w-6 bg-green-500' : 'w-4 bg-gray-200'
                  }`}
                />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 ${
                    isComplete
                      ? 'bg-green-500 text-white shadow-sm shadow-green-200'
                      : isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 ring-2 ring-blue-300'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isComplete ? '✓' : (
                    <span className="hidden sm:inline">{i + 1}</span>
                  )}
                  {!isComplete && (
                    <span className="sm:hidden">{step.icon}</span>
                  )}
                </div>
                <span
                  className={`hidden text-[11px] font-medium sm:inline ${
                    isActive ? 'text-blue-700' : isFuture ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sub-phase detail during analysis */}
      {isAnalyzing && (
        <div className="mt-1.5 flex items-center justify-center gap-2 border-t border-gray-100 pt-1.5">
          <div className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-500" />
          <span className="text-[10px] font-medium text-blue-600">
            {subPhaseLabel(phase)}
          </span>
          <span className="text-[10px] tabular-nums text-gray-400">{elapsed}s</span>
        </div>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useEstimate } from '@/contexts/EstimateContext';
import { generateNudges } from '@/lib/estimate/nudges';
import type { Nudge } from '@/lib/estimate/nudges';

const DISMISSED_KEY = 'estimate-nudges-dismissed';

function loadDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch { /* noop */ }
}

interface NudgeBannerProps {
  /** Filter nudges to only show those targeting this tab */
  tab: string;
}

export function NudgeBanner({ tab }: NudgeBannerProps) {
  const { input } = useEstimate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const nudges = useMemo(() => {
    return generateNudges(input).filter((n) => n.targetTab === tab && !dismissed.has(n.id));
  }, [input, tab, dismissed]);

  if (nudges.length === 0) return null;

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set([...prev, id]);
      saveDismissed(next);
      return next;
    });
  };

  return (
    <div className="mb-3 space-y-2">
      {nudges.map((nudge) => (
        <NudgeRow key={nudge.id} nudge={nudge} onDismiss={() => dismiss(nudge.id)} />
      ))}
    </div>
  );
}

function NudgeRow({ nudge, onDismiss }: { nudge: Nudge; onDismiss: () => void }) {
  const isWarning = nudge.severity === 'warning';

  return (
    <div
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[0.75rem] leading-relaxed ${
        isWarning
          ? 'bg-amber-50 text-amber-800 border border-amber-200'
          : 'bg-blue-50 text-blue-700 border border-blue-200'
      }`}
    >
      <span className="mt-0.5 flex-shrink-0 text-sm">
        {isWarning ? '\u26A0\uFE0F' : '\u2139\uFE0F'}
      </span>
      <span className="flex-1">{nudge.message}</span>
      <button
        onClick={onDismiss}
        className={`flex-shrink-0 text-sm hover:opacity-60 ${isWarning ? 'text-amber-400' : 'text-blue-400'}`}
        aria-label="Dismiss"
        title="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}

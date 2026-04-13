'use client';

import { useMemo } from 'react';
import type { MapWorkspaceState } from '@/lib/map/types';
import type { EstimateInput } from '@/lib/estimate/types';
import { detectContradictions, type Contradiction } from '@/lib/map/contradictions';

interface ContradictionBannerProps {
  mapState: MapWorkspaceState;
  input: EstimateInput;
}

export function ContradictionBanner({ mapState, input }: ContradictionBannerProps) {
  const contradictions = useMemo(
    () => detectContradictions(input, mapState),
    [input, mapState],
  );

  if (contradictions.length === 0) return null;

  const errors = contradictions.filter((c) => c.severity === 'error');
  const warnings = contradictions.filter((c) => c.severity === 'warning');

  return (
    <div className="space-y-1.5">
      {errors.map((c) => (
        <ContradictionRow key={c.id} contradiction={c} />
      ))}
      {warnings.map((c) => (
        <ContradictionRow key={c.id} contradiction={c} />
      ))}
    </div>
  );
}

function ContradictionRow({ contradiction }: { contradiction: Contradiction }) {
  const isError = contradiction.severity === 'error';
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${
        isError
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      <span className="mr-1 font-semibold">{isError ? 'Conflict:' : 'Warning:'}</span>
      {contradiction.message}
    </div>
  );
}

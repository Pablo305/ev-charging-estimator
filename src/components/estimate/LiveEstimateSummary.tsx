'use client';

import { useState } from 'react';
import type { AutoEstimateResult } from '@/hooks/useAutoEstimate';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

interface LiveEstimateSummaryProps {
  readonly autoEstimate: AutoEstimateResult;
}

export function LiveEstimateSummary({ autoEstimate }: LiveEstimateSummaryProps) {
  const { estimate, isGenerating, inputCompleteness, previousTotal } = autoEstimate;
  const [expanded, setExpanded] = useState(false);

  if (inputCompleteness < 30) return null;

  const total = estimate?.summary.total ?? 0;
  const delta = previousTotal !== null && estimate ? total - previousTotal : null;
  const lineCount = estimate?.lineItems.length ?? 0;
  const tbdCount = estimate?.lineItems.filter((li) => li.pricingSource === 'tbd').length ?? 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 print:hidden" style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', background: 'var(--glass-bg-heavy)', backdropFilter: 'saturate(180%) blur(28px)', WebkitBackdropFilter: 'saturate(180%) blur(28px)', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
      <div className="mx-auto max-w-7xl px-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse estimate summary' : 'Expand estimate summary'}
          className="flex w-full items-center justify-between py-3.5"
        >
          <div className="flex items-center gap-4">
            {isGenerating && (
              <div className="flex items-center gap-2 text-[0.75rem] font-medium" style={{ color: 'var(--system-blue)' }}>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--system-blue)', borderTopColor: 'transparent' }} />
                Updating...
              </div>
            )}
            {!isGenerating && estimate && (
              <>
                <span className="text-[0.8125rem] text-gray-500">{lineCount} line items</span>
                {tbdCount > 0 && (
                  <span className="lg-pill px-2.5 py-1 text-[0.6875rem] font-medium" style={{ background: 'rgba(255,149,0,0.1)', color: 'var(--system-orange)' }}>
                    {tbdCount} need review
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {delta !== null && delta !== 0 && (
              <span className="text-[0.8125rem] font-semibold" style={{ color: delta > 0 ? 'var(--system-red)' : 'var(--system-green)' }}>
                {delta > 0 ? '+' : ''}{fmt(delta)}
              </span>
            )}
            <span className="text-lg font-bold text-gray-900">
              {estimate ? fmt(total) : '--'}
            </span>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </div>
        </button>

        {expanded && estimate && (
          <div className="border-t border-black/[0.06] pb-4 pt-3">
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Hardware', value: estimate.summary.hardwareTotal },
                { label: 'Installation', value: estimate.summary.installationTotal },
                { label: 'Permit/Design', value: estimate.summary.permitDesignTotal },
                { label: 'Network', value: estimate.summary.networkTotal },
                { label: 'Accessories', value: estimate.summary.accessoriesTotal },
                { label: 'Service/SW', value: estimate.summary.serviceTotal },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between px-3 py-2" style={{ borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.03)' }}>
                  <span className="text-[0.6875rem] text-gray-500">{item.label}</span>
                  <span className="text-[0.6875rem] font-medium text-gray-900">{fmt(item.value)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2 sm:gap-4 text-[0.75rem] text-gray-500">
              <span>Subtotal: {fmt(estimate.summary.subtotal)}</span>
              <span>Tax: {fmt(estimate.summary.tax)}</span>
              <span>Contingency: {fmt(estimate.summary.contingency)}</span>
              <span className="font-semibold text-gray-900">Total: {fmt(estimate.summary.total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

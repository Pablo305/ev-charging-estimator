'use client';

import type { EstimateOutput } from '@/lib/estimate/types';

interface EstimateImpactPanelProps {
  estimate: EstimateOutput | null;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n);
}

function ConfidenceMeter({ confidence, completeness }: { confidence: string; completeness: number }) {
  const pct = Math.round(completeness * 100);
  const colorMap: Record<string, string> = {
    high: 'from-green-500 to-emerald-500',
    medium: 'from-amber-500 to-yellow-500',
    low: 'from-red-500 to-orange-500',
  };
  const badgeMap: Record<string, string> = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-red-100 text-red-800',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600">Estimate Confidence</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badgeMap[confidence] ?? badgeMap.low}`}>
          {confidence}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out ${colorMap[confidence] ?? colorMap.low}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-gray-400">{pct}% of fields filled</div>
    </div>
  );
}

export function EstimateImpactPanel({ estimate }: EstimateImpactPanelProps) {
  if (!estimate) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-5 text-center">
        <div className="mb-2 text-2xl">📊</div>
        <div className="text-sm font-medium text-gray-600">No estimate yet</div>
        <div className="mt-1 text-xs text-gray-400">
          Accept map patches to generate a live estimate
        </div>
      </div>
    );
  }

  const { summary, lineItems, manualReviewTriggers, metadata } = estimate;

  const categories = new Map<string, typeof lineItems>();
  for (const item of lineItems) {
    const existing = categories.get(item.category) ?? [];
    categories.set(item.category, [...existing, item]);
  }

  const criticalReviews = manualReviewTriggers.filter(
    (r) => r.severity === 'critical',
  );

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Estimate Impact
      </div>

      {/* Confidence meter */}
      <ConfidenceMeter
        confidence={metadata.automationConfidence}
        completeness={metadata.inputCompleteness}
      />

      {/* Grand total */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="text-xs font-medium text-blue-600">Estimated Total</div>
        <div className="text-2xl font-bold text-blue-900">
          {fmt(summary.total)}
        </div>
        <div className="mt-1.5 flex gap-3 text-xs text-blue-600/70">
          <span>Subtotal: {fmt(summary.subtotal)}</span>
          <span>Tax: {fmt(summary.tax)}</span>
        </div>
      </div>

      {/* Category breakdowns */}
      <div className="space-y-0.5 rounded-lg border border-gray-100 bg-white p-2">
        {[
          { label: 'Hardware', value: summary.hardwareTotal },
          { label: 'Installation', value: summary.installationTotal },
          { label: 'Permit/Design', value: summary.permitDesignTotal },
          { label: 'Network', value: summary.networkTotal },
          { label: 'Accessories', value: summary.accessoriesTotal },
          { label: 'Service', value: summary.serviceTotal },
        ]
          .filter((c) => c.value > 0)
          .map((cat) => (
            <div
              key={cat.label}
              className="flex justify-between rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <span className="text-gray-600">{cat.label}</span>
              <span className="font-mono font-medium text-gray-900">{fmt(cat.value)}</span>
            </div>
          ))}
      </div>

      {/* Line items */}
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Line Items ({lineItems.length})
        </div>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {lineItems.map((item) => (
            <div
              key={item.id}
              className={`flex justify-between rounded-md border px-2.5 py-1.5 text-xs ${
                item.manualReviewRequired
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-gray-100 bg-white'
              }`}
            >
              <span className="flex-1 truncate text-gray-700">
                {item.description}
              </span>
              <span className="ml-2 font-mono font-medium text-gray-900">
                {fmt(item.extendedPrice)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Critical reviews */}
      {criticalReviews.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-red-500">
            Review Required ({criticalReviews.length})
          </div>
          {criticalReviews.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              {r.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { EstimateOutput } from '@/lib/estimate/types';
import { generateEstimate } from '@/lib/estimate/engine';
import { exportEstimatePDF } from '@/lib/estimate/export-pdf';
import { useEstimate } from '@/contexts/EstimateContext';
import { MAP_WORKSPACE_ENABLED } from '@/lib/map/feature-flags';

// Dynamic import — Mapbox GL requires DOM
const MapWorkspace = dynamic(
  () => import('@/components/map/MapWorkspace').then((m) => m.MapWorkspace),
  { ssr: false, loading: () => <MapLoadingPlaceholder /> },
);

function MapLoadingPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="mb-2 text-lg font-medium text-gray-600">Loading Map Workspace...</div>
        <div className="text-sm text-gray-400">Initializing satellite imagery</div>
      </div>
    </div>
  );
}

export default function MapEstimatePage() {
  const { input, setInput } = useEstimate();

  const estimate = useMemo<EstimateOutput | null>(() => {
    // Allow estimate when charger count is set OR when map workspace has distance data
    const hasChargerCount = input.charger.count && input.charger.count > 0;
    const hasMapData = input.mapWorkspace && (
      (input.mapWorkspace.conduitDistance_ft ?? 0) > 0 ||
      (input.mapWorkspace.trenchingDistance_ft ?? 0) > 0 ||
      (input.mapWorkspace.boringDistance_ft ?? 0) > 0
    );
    if (!hasChargerCount && !hasMapData) return null;
    return generateEstimate(input);
  }, [input]);

  if (!MAP_WORKSPACE_ENABLED) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-bold text-gray-800">Map Workspace</h1>
          <p className="mb-4 text-gray-500">
            Map workspace is not enabled. Set NEXT_PUBLIC_MAP_WORKSPACE=true to enable.
          </p>
          <Link href="/estimate" className="text-blue-600 hover:underline">
            Back to Estimate Form
          </Link>
        </div>
      </div>
    );
  }

  // Key form fields for mini summary
  const summaryFields = useMemo(() => [
    { label: 'Project', value: input.project.name || '—', tab: 'Project' },
    { label: 'Type', value: input.project.projectType?.replace(/_/g, ' ') || '—', tab: 'Project' },
    { label: 'Charger', value: input.charger.brand ? `${input.charger.count}× ${input.charger.brand} ${input.charger.model}` : '—', tab: 'Charger' },
    { label: 'Level', value: input.charger.chargingLevel || '—', tab: 'Charger' },
    { label: 'Site', value: input.site.siteType || '—', tab: 'Site' },
    { label: 'Surface', value: input.parkingEnvironment.surfaceType || '—', tab: 'Parking' },
  ], [input]);

  const [showMiniSummary, setShowMiniSummary] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-gray-800">
            Map Workspace
          </h1>
          {input.project.name && (
            <span className="text-sm text-gray-500">
              &mdash; {input.project.name}
            </span>
          )}
          <span className="rounded bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
            Changes save automatically
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <button
            onClick={() => setShowMiniSummary((v) => !v)}
            className="rounded bg-blue-50 px-2 py-1 text-blue-600 hover:bg-blue-100"
          >
            {showMiniSummary ? 'Hide' : 'Show'} Form Summary
          </button>
          <Link
            href="/estimate"
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Generate Estimate
          </Link>
          {estimate && (
            <button
              onClick={() => exportEstimatePDF(estimate)}
              className="rounded bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
            >
              Download PDF
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium" style={{ background: estimate ? 'rgba(52,199,89,0.1)' : 'rgba(0,0,0,0.04)', color: estimate ? '#059669' : '#8e8e93' }}>
            {estimate ? `Estimate: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.summary.total)}` : 'No estimate yet'}
          </span>
          <span>Click to draw runs</span>
          <span>&bull;</span>
          <span>Double-click to finish</span>
          <span>&bull;</span>
          <span>Right-click to cancel/delete</span>
        </div>
      </header>

      {/* Mini Form Summary */}
      {showMiniSummary && (
        <div className="border-b border-gray-200 bg-blue-50/50 px-4 py-2">
          <div className="flex flex-wrap items-center gap-3">
            {summaryFields.map((f) => (
              <Link
                key={f.label}
                href={`/estimate?tab=${encodeURIComponent(f.tab)}`}
                className="flex items-center gap-1.5 rounded bg-white px-2.5 py-1 text-xs shadow-sm hover:bg-blue-50"
              >
                <span className="font-medium text-gray-500">{f.label}:</span>
                <span className={`font-semibold ${f.value === '—' ? 'text-gray-300' : 'text-gray-800'}`}>{f.value}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main workspace */}
      <main className="flex-1 overflow-hidden">
        <MapWorkspace
          input={input}
          estimate={estimate}
          onInputChange={setInput}
        />
      </main>
    </div>
  );
}

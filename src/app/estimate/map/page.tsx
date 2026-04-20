'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useEstimate } from '@/contexts/EstimateContext';
import { emptyInput } from '@/lib/estimate/emptyInput';
import type { MapWorkspaceState } from '@/lib/map/types';
import { createEstimateInputFromTakeoff } from '@/lib/map/takeoff';
import { MapTakeoffWorkspace } from '@/components/map/MapTakeoffWorkspace';

export default function MapPage() {
  const router = useRouter();
  const { input, setInput } = useEstimate();

  const handleAddToEstimate = useCallback((mapState: MapWorkspaceState, siteAddress: string, siteState: string) => {
    const nextInput = createEstimateInputFromTakeoff(mapState, input, { siteAddress, siteState });
    setInput(nextInput);
    router.push('/estimate');
  }, [input, router, setInput]);

  const handleStartNewEstimate = useCallback((mapState: MapWorkspaceState, siteAddress: string, siteState: string) => {
    const nextInput = createEstimateInputFromTakeoff(mapState, emptyInput(), { siteAddress, siteState });
    setInput(nextInput);
    router.push('/estimate');
  }, [router, setInput]);

  return (
    <main className="min-h-screen bg-gray-50 pb-8">
      <div className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-6">
        <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between lg:p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-600">Standalone Tool</div>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">Map Takeoff</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Use the map strictly for takeoffs. Draw conduit, feeder, trenching, boring, and equipment placements,
              then decide later whether those measurements should flow into a current estimate or start a new one.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/estimate"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Back to estimate
            </Link>
          </div>
        </div>

        <MapTakeoffWorkspace
          estimateInput={input}
          onAddToEstimate={handleAddToEstimate}
          onStartNewEstimate={handleStartNewEstimate}
        />
      </div>
    </main>
  );
}

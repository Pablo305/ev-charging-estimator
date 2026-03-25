'use client';

import { useCallback, useState } from 'react';
import type { RunSegment, EquipmentPlacement } from '@/lib/map/types';
import type { PlanAnalysisResponse } from '@/lib/ai/plan-analysis-types';
import { planAnalysisToMapPlacements } from '@/lib/map/plan-from-relative';

interface PlanUploadPanelProps {
  siteCoordinates: [number, number] | null;
  onApply: (runs: readonly RunSegment[], equipment: readonly EquipmentPlacement[]) => void;
}

/** Upload a site plan image; AI suggests normalized placements — user applies to map for review. */
export function PlanUploadPanel({ siteCoordinates, onApply }: PlanUploadPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlanAnalysisResponse | null>(null);

  const onPick = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setError(null);
      setResult(null);
      if (!file.type.startsWith('image/')) {
        setError('Please upload a PNG or JPG plan image.');
        return;
      }
      setBusy(true);
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(new Error('read failed'));
          r.readAsDataURL(file);
        });
        const comma = dataUrl.indexOf(',');
        const imageBase64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
        const mimeType = file.type || 'image/jpeg';

        const res = await fetch('/api/ai/analyze-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64, mimeType }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? `Error ${res.status}`);
          return;
        }
        setResult(data as PlanAnalysisResponse);
      } catch {
        setError('Upload failed.');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const handleApply = useCallback(() => {
    if (!result || !siteCoordinates) return;
    const { runs, equipment } = planAnalysisToMapPlacements(result, siteCoordinates);
    onApply(runs, equipment);
    setResult(null);
  }, [result, siteCoordinates, onApply]);

  return (
    <div className="space-y-2 border-t border-gray-100 pt-3">
      <div className="text-xs font-semibold text-gray-800">Plan / drawing (AI placement hints)</div>
      <p className="text-[0.6875rem] leading-snug text-gray-500">
        Upload a PNG/JPG site plan. AI returns normalized placements — review on the map before syncing to the estimate.
      </p>
      <label className="flex cursor-pointer flex-col gap-1">
        <span className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-center text-[0.8125rem] text-gray-600 hover:bg-gray-100">
          {busy ? 'Analyzing…' : 'Choose plan image'}
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="fixed h-0 w-0 opacity-0"
          disabled={busy}
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
      </label>
      {error && <p className="text-[0.6875rem] text-red-600">{error}</p>}
      {result && (
        <div className="rounded-lg bg-amber-50 p-2 text-[0.6875rem] text-amber-900">
          <p className="font-medium">Confidence: {result.confidence}</p>
          {result.needsReview && <p className="mt-1">Review required before relying on geometry.</p>}
          <p className="mt-1 text-amber-800">{result.notes}</p>
          <p className="mt-1 text-gray-600">
            {result.runs.length} run(s), {result.equipment.length} equipment marker(s) suggested.
          </p>
          <button
            type="button"
            disabled={!siteCoordinates}
            onClick={handleApply}
            className="mt-2 w-full rounded-md bg-blue-600 px-3 py-1.5 text-[0.75rem] font-medium text-white disabled:opacity-40"
          >
            {siteCoordinates ? 'Apply to map (review)' : 'Geocode address first'}
          </button>
        </div>
      )}
    </div>
  );
}

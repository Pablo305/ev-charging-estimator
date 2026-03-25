'use client';

import { useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { EstimateOutput } from '@/lib/estimate/types';
import type { SharedEstimateRecord } from '@/lib/estimate/shared-types';
import type { EquipmentPlacement } from '@/lib/map/types';
import { SharedEstimateMapViewer } from '@/components/map/SharedEstimateMapViewer';
import { ConceptualSiteOverlay } from '@/components/estimate/ConceptualSiteOverlay';
import { SharedEstimateChat } from '@/components/SharedEstimateChat';
import { exportEstimatePDFWithPreviews } from '@/lib/estimate/export-pdf';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function drawingsToEquipment(input: EstimateOutput['input']): EquipmentPlacement[] {
  const raw = input.mapWorkspace?.drawings?.equipment ?? [];
  return raw.map((e) => ({
    id: e.id,
    equipmentType: e.equipmentType as EquipmentPlacement['equipmentType'],
    label: e.label,
    properties: {},
    geometry: {
      type: 'Point' as const,
      coordinates: e.geometry.coordinates as [number, number],
    },
  }));
}

export function SharedEstimateClient({ record }: { record: SharedEstimateRecord }) {
  const output = record.output;
  const id = record.id;

  const equipment = useMemo(() => drawingsToEquipment(output.input), [output.input]);

  const handleDownloadPdf = useCallback(async () => {
    await exportEstimatePDFWithPreviews(output, record.previewAssets);
  }, [output, record.previewAssets]);

  const { summary, metadata, lineItems, exclusions, manualReviewTriggers } = output;

  return (
    <div className="min-h-screen bg-gray-50 pb-16 pt-8">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">BulletEV</p>
            <h1 className="text-2xl font-bold text-gray-900">{output.input.project.name || 'Project estimate'}</h1>
            <p className="text-sm text-gray-600">
              {output.input.customer.companyName} · {output.input.site.address}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Download PDF (with site previews)
            </button>
            <Link
              href="/estimate"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Build new estimate
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-[0.6875rem] text-gray-500">Total</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(summary.total)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-[0.6875rem] text-gray-500">Confidence</p>
                  <p className="text-xl font-bold text-gray-900">{metadata.automationConfidence.toUpperCase()}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-[0.6875rem] text-gray-500">Completeness</p>
                  <p className="text-xl font-bold text-gray-900">{metadata.inputCompleteness}%</p>
                </div>
              </div>
              {manualReviewTriggers.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <strong>Manual review:</strong> {manualReviewTriggers.length} item(s) flagged — see line items for
                  details.
                </div>
              )}
            </section>

            <section>
              <SharedEstimateMapViewer key={id} input={output.input} />
            </section>

            {equipment.length > 0 && (
              <section>
                <ConceptualSiteOverlay equipment={equipment} />
              </section>
            )}

            {record.previewAssets?.satelliteStaticUrl && (
              <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">Satellite preview</h3>
                {/* eslint-disable-next-line @next/next/no-img-element -- external Mapbox static URL */}
                <img
                  src={record.previewAssets.satelliteStaticUrl}
                  alt="Satellite preview of site"
                  className="mt-2 max-h-80 w-full rounded-lg object-cover"
                />
              </section>
            )}

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Line items ({lineItems.length})</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="py-2 pr-2">Description</th>
                      <th className="py-2 pr-2">Qty</th>
                      <th className="py-2 text-right">Ext.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li) => (
                      <tr key={li.id} className="border-b border-gray-100">
                        <td className="py-2 pr-2">{li.description}</td>
                        <td className="py-2 pr-2">
                          {li.quantity} {li.unit}
                        </td>
                        <td className="py-2 text-right font-medium">{fmt(li.extendedPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {exclusions.length > 0 && (
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Exclusions</h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700">
                  {exclusions.map((ex) => (
                    <li key={ex.id}>
                      <span className="font-medium text-gray-800">{ex.category}:</span> {ex.text}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="lg:col-span-1">
            <SharedEstimateChat shareId={id} output={output} />
          </div>
        </div>

        <p className="mt-10 text-center text-[0.6875rem] text-gray-400">
          For budgetary purposes only — subject to site survey and engineering.
        </p>
      </div>
    </div>
  );
}

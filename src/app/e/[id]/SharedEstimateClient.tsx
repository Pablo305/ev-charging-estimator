'use client';

import { useMemo, useCallback, useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import type { EstimateOutput, EstimateLineItem, EstimateCategory } from '@/lib/estimate/types';
import type { SharedEstimateRecord } from '@/lib/estimate/shared-types';
import type { EquipmentPlacement } from '@/lib/map/types';
import { SharedEstimateMapViewer } from '@/components/map/SharedEstimateMapViewer';
import { ConceptualSiteOverlay } from '@/components/estimate/ConceptualSiteOverlay';
import { SharedEstimateChat } from '@/components/SharedEstimateChat';
import { exportEstimatePDFWithPreviews } from '@/lib/estimate/export-pdf';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
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

function formatProjectType(pt: string): string {
  return pt
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function confidenceColor(c: 'high' | 'medium' | 'low'): string {
  if (c === 'high') return 'bg-emerald-500';
  if (c === 'medium') return 'bg-amber-500';
  return 'bg-red-500';
}

function confidenceTextColor(c: 'high' | 'medium' | 'low'): string {
  if (c === 'high') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (c === 'medium') return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function severityColor(s: 'critical' | 'warning' | 'info'): string {
  if (s === 'critical') return 'text-red-700 bg-red-50 border-red-200';
  if (s === 'warning') return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-blue-700 bg-blue-50 border-blue-200';
}

type CategoryGroup = {
  key: string;
  label: string;
  color: string;
  barColor: string;
  amount: number;
  items: EstimateLineItem[];
};

const CATEGORY_MAP: Record<string, { label: string; color: string; barColor: string }> = {
  hardware: { label: 'Hardware', color: 'text-blue-600', barColor: 'bg-blue-500' },
  installation: { label: 'Installation', color: 'text-violet-600', barColor: 'bg-violet-500' },
  permitDesign: { label: 'Permit & Design', color: 'text-amber-600', barColor: 'bg-amber-500' },
  network: { label: 'Network', color: 'text-cyan-600', barColor: 'bg-cyan-500' },
  accessories: { label: 'Accessories', color: 'text-emerald-600', barColor: 'bg-emerald-500' },
  service: { label: 'Service', color: 'text-rose-600', barColor: 'bg-rose-500' },
};

function categorizeLine(cat: EstimateCategory): string {
  if (['CHARGER', 'PEDESTAL'].includes(cat)) return 'hardware';
  if (['ELEC', 'ELEC LBR', 'ELEC LBR MAT', 'ELEC MAT', 'CIVIL', 'SITE WORK', 'MATERIAL', 'SAFETY'].includes(cat)) return 'installation';
  if (['PERMIT', 'DES/ENG'].includes(cat)) return 'permitDesign';
  if (['NETWORK', 'SOFTWARE'].includes(cat)) return 'network';
  if (['MISC'].includes(cat)) return 'accessories';
  return 'service';
}

/* ------------------------------------------------------------------ */
/*  Animated Progress Bar                                             */
/* ------------------------------------------------------------------ */

function AnimatedBar({ percentage, colorClass, delay }: { percentage: number; colorClass: string; delay: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), delay);
    return () => clearTimeout(timer);
  }, [percentage, delay]);

  return (
    <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Completeness Ring (SVG)                                           */
/* ------------------------------------------------------------------ */

function CompletenessRing({ value }: { value: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width="72" height="72" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke="url(#ringGrad)" strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '36px 36px' }}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="15" fontWeight="700">
        {value}%
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Standard Quote Modal                                              */
/* ------------------------------------------------------------------ */

function StandardQuoteView({
  output,
  onClose,
}: {
  output: EstimateOutput;
  onClose: () => void;
}) {
  const { summary, lineItems, exclusions, metadata, input } = output;
  const quoteDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/60 backdrop-blur-sm print:static print:bg-white print:backdrop-blur-none">
      <div className="my-8 w-full max-w-3xl bg-white shadow-2xl rounded-xl print:shadow-none print:rounded-none print:my-0 print:max-w-none">
        {/* Print / Close controls */}
        <div className="flex items-center justify-end gap-2 p-4 border-b print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Print Quote
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="p-8 print:p-6">
          {/* Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-blue-600">
                  <path d="M13 2L4.09 12.11A1 1 0 004.84 13.5H10L9 22L17.91 11.89A1 1 0 0017.16 10.5H12L13 2Z" fill="currentColor" />
                </svg>
                <span className="text-2xl font-bold tracking-tight text-gray-900">BulletEV</span>
              </div>
              <p className="text-xs text-gray-500">EV Charging Infrastructure Solutions</p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-semibold text-gray-900">QUOTE</p>
              <p>{quoteDate}</p>
              <p>Engine v{metadata.engineVersion}</p>
            </div>
          </div>

          {/* Client & Project Info */}
          <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Prepared For</p>
              <p className="font-semibold text-gray-900">{input.customer.companyName}</p>
              <p className="text-gray-600">{input.customer.contactName}</p>
              <p className="text-gray-600">{input.customer.contactEmail}</p>
              {input.customer.contactPhone && <p className="text-gray-600">{input.customer.contactPhone}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Project</p>
              <p className="font-semibold text-gray-900">{input.project.name || 'EV Charging Installation'}</p>
              <p className="text-gray-600">{input.site.address}</p>
              <p className="text-gray-600">{formatProjectType(input.project.projectType)}</p>
            </div>
          </div>

          {/* Scope Summary */}
          <div className="mb-6 rounded-lg bg-gray-50 p-4 text-sm print:bg-gray-50">
            <p className="font-semibold text-gray-900 mb-2">Scope of Work</p>
            <p className="text-gray-700">
              Supply and installation of {input.charger.count} {input.charger.brand} {input.charger.model} EV
              charging station{input.charger.count !== 1 ? 's' : ''} at the above location, including all
              electrical, civil, permitting, and ancillary work as described below.
            </p>
          </div>

          {/* Cost Table */}
          <table className="w-full text-sm mb-6 border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 font-semibold text-gray-700">Description</th>
                <th className="text-center py-2 font-semibold text-gray-700 w-16">Qty</th>
                <th className="text-right py-2 font-semibold text-gray-700 w-28">Unit Price</th>
                <th className="text-right py-2 font-semibold text-gray-700 w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => (
                <tr key={li.id} className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-800">{li.description}</td>
                  <td className="py-1.5 text-center text-gray-600">{li.quantity} {li.unit}</td>
                  <td className="py-1.5 text-right text-gray-600">{fmt(li.unitPrice)}</td>
                  <td className="py-1.5 text-right font-medium text-gray-900">{fmt(li.extendedPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={3} className="pt-3 text-right font-medium text-gray-600">Subtotal</td>
                <td className="pt-3 text-right font-medium text-gray-900">{fmt(summary.subtotal)}</td>
              </tr>
              {summary.tax > 0 && (
                <tr>
                  <td colSpan={3} className="py-1 text-right text-gray-600">Tax</td>
                  <td className="py-1 text-right text-gray-900">{fmt(summary.tax)}</td>
                </tr>
              )}
              {summary.contingency > 0 && (
                <tr>
                  <td colSpan={3} className="py-1 text-right text-gray-600">Contingency</td>
                  <td className="py-1 text-right text-gray-900">{fmt(summary.contingency)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-900">
                <td colSpan={3} className="pt-2 text-right text-lg font-bold text-gray-900">Total</td>
                <td className="pt-2 text-right text-lg font-bold text-gray-900">{fmt(summary.total)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Exclusions */}
          {exclusions.length > 0 && (
            <div className="mb-6">
              <p className="font-semibold text-gray-900 text-sm mb-2">Exclusions</p>
              <ul className="list-disc pl-5 text-xs text-gray-600 space-y-1">
                {exclusions.map((ex) => (
                  <li key={ex.id}>{ex.text}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Terms */}
          <div className="mb-8 text-xs text-gray-500 space-y-1 border-t pt-4">
            <p className="font-semibold text-gray-700 text-sm mb-2">Terms & Conditions</p>
            <p>1. This quote is valid for 30 days from the date above.</p>
            <p>2. All prices are in USD and subject to final site survey verification.</p>
            <p>3. Payment terms: 50% upon acceptance, 50% upon completion.</p>
            <p>4. Timeline estimates are subject to permit approval and material availability.</p>
            <p>5. Any changes to the scope of work may result in revised pricing.</p>
            <p>6. This estimate is for budgetary purposes and is subject to engineering review.</p>
          </div>

          {/* Signature Lines */}
          <div className="grid grid-cols-2 gap-12 pt-4">
            <div>
              <div className="border-b border-gray-400 mb-1 h-10" />
              <p className="text-xs text-gray-500">Client Signature & Date</p>
              <p className="text-xs text-gray-400 mt-1">{input.customer.companyName}</p>
            </div>
            <div>
              <div className="border-b border-gray-400 mb-1 h-10" />
              <p className="text-xs text-gray-500">BulletEV Representative & Date</p>
              <p className="text-xs text-gray-400 mt-1">{input.project.salesRep || 'Authorized Representative'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export interface ResolvedPreviewUrls {
  satelliteStaticUrl?: string;
  streetViewStaticUrl?: string;
}

export function SharedEstimateClient({
  record,
  previewUrls,
}: {
  record: SharedEstimateRecord;
  /**
   * Server-resolved preview URLs (built in `/e/[id]/page.tsx`). Built
   * with the public browser key only — see `buildStreetViewStaticUrl`.
   * Resolved server-side purely for stable SSR and to centralize the
   * display-time URL-build call site.
   */
  previewUrls?: ResolvedPreviewUrls;
}) {
  const output = record.output;
  const id = record.id;

  const equipment = useMemo(() => drawingsToEquipment(output.input), [output.input]);

  const displayPreviewUrls: ResolvedPreviewUrls = previewUrls ?? {};

  const handleDownloadPdf = useCallback(async () => {
    // Pass server-resolved URLs into the PDF export so it doesn't try to
    // rebuild them client-side (where the server key is unavailable).
    // `exportEstimatePDFWithPreviews` prefers URLs already present on
    // the `SharedPreviewAssets` shape over rebuilding from coordinates.
    const pdfPreviewAssets = {
      ...record.previewAssets,
      satelliteStaticUrl:
        displayPreviewUrls.satelliteStaticUrl ??
        record.previewAssets?.satelliteStaticUrl,
      streetViewStaticUrl:
        displayPreviewUrls.streetViewStaticUrl ??
        record.previewAssets?.streetViewStaticUrl,
    };
    await exportEstimatePDFWithPreviews(output, pdfPreviewAssets);
  }, [output, record.previewAssets, displayPreviewUrls]);

  const { summary, metadata, lineItems, exclusions, manualReviewTriggers, input } = output;

  // --- State ---
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'description' | 'quantity' | 'extendedPrice'>('description');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showChat, setShowChat] = useState(true);
  const [showStandardQuote, setShowStandardQuote] = useState(false);

  // --- Category groups ---
  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    const groups: Record<string, CategoryGroup> = {};
    for (const [key, meta] of Object.entries(CATEGORY_MAP)) {
      groups[key] = { key, label: meta.label, color: meta.color, barColor: meta.barColor, amount: 0, items: [] };
    }
    for (const li of lineItems) {
      const gk = categorizeLine(li.category);
      if (groups[gk]) {
        groups[gk].amount += li.extendedPrice;
        groups[gk].items.push(li);
      }
    }
    return Object.values(groups).filter((g) => g.amount > 0);
  }, [lineItems]);

  // --- Filtered / sorted line items ---
  const filteredItems = useMemo(() => {
    let items = [...lineItems];
    if (categoryFilter !== 'all') {
      items = items.filter((li) => categorizeLine(li.category) === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (li) =>
          li.description.toLowerCase().includes(q) ||
          li.category.toLowerCase().includes(q) ||
          li.ruleName.toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return items;
  }, [lineItems, categoryFilter, searchQuery, sortField, sortDir]);

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // --- Map measurement summary ---
  const mapData = input.mapWorkspace;
  const hasMapData = !!(
    mapData &&
    (mapData.conduitDistance_ft || mapData.trenchingDistance_ft || mapData.boringDistance_ft || mapData.chargerCountFromMap)
  );

  const quoteDate = new Date(record.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      {showStandardQuote && (
        <StandardQuoteView output={output} onClose={() => setShowStandardQuote(false)} />
      )}

      <div className="min-h-screen bg-[var(--background)] print:bg-white">
        {/* Ambient mesh background */}
        <div className="ambient-mesh print:hidden" />

        {/* ============================================================ */}
        {/*  HERO HEADER                                                 */}
        {/* ============================================================ */}
        <header className="hero-canvas relative z-10 print:bg-white print:text-black">
          <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left: Branding + Project info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 print:bg-blue-100">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M13 2L4.09 12.11A1 1 0 004.84 13.5H10L9 22L17.91 11.89A1 1 0 0017.16 10.5H12L13 2Z"
                        fill="#60a5fa"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold tracking-widest uppercase text-blue-400 print:text-blue-600">
                    BulletEV
                  </span>
                </div>

                <h1 className="lg-gradient-text text-3xl font-bold tracking-tight sm:text-4xl print:text-black print:bg-none print:bg-clip-border">
                  {input.project.name || 'Project Estimate'}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 print:text-gray-600">
                  <span>{input.customer.companyName}</span>
                  <span className="hidden sm:inline text-gray-600">|</span>
                  <span>{input.site.address}</span>
                  <span className="hidden sm:inline text-gray-600">|</span>
                  <span>{quoteDate}</span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`lg-pill print:border print:border-gray-300 ${metadata.automationConfidence === 'high' ? 'text-emerald-400' : metadata.automationConfidence === 'medium' ? 'text-amber-400' : 'text-red-400'}`}>
                    <span className={`lg-dot ${confidenceColor(metadata.automationConfidence)}`} />
                    {metadata.automationConfidence.charAt(0).toUpperCase() + metadata.automationConfidence.slice(1)} Confidence
                  </span>
                  <span className="lg-pill text-white/80 print:text-gray-700 print:border print:border-gray-300">
                    Engine v{metadata.engineVersion}
                  </span>
                </div>
              </div>

              {/* Right: Total + CTAs + Completeness */}
              <div className="flex flex-col items-start gap-5 lg:items-end">
                <div className="flex items-center gap-5">
                  <CompletenessRing value={metadata.inputCompleteness} />
                  <div className="text-right">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 print:text-gray-500">
                      Estimated Total
                    </p>
                    <p className="text-4xl font-extrabold tracking-tight text-white print:text-gray-900">
                      {fmt(summary.total)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => void handleDownloadPdf()}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 hover:shadow-blue-500/30 active:scale-[0.98]"
                  >
                    Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStandardQuote(true)}
                    className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm border border-white/20 transition hover:bg-white/20 active:scale-[0.98]"
                  >
                    Standard Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm border border-white/20 transition hover:bg-white/20 active:scale-[0.98]"
                  >
                    Print Quote
                  </button>
                  <Link
                    href="/estimate"
                    className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm border border-white/20 transition hover:bg-white/20 active:scale-[0.98]"
                  >
                    Request Changes
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/*  MAIN CONTENT                                                */}
        {/* ============================================================ */}
        <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Left Column */}
            <div className="space-y-6 min-w-0">

              {/* -------------------------------------------------------- */}
              {/*  B. Cost Breakdown                                       */}
              {/* -------------------------------------------------------- */}
              <section className="lg-panel-heavy p-6 print:bg-white print:border print:border-gray-200 print:shadow-none print:backdrop-blur-none">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Cost Breakdown</h2>

                <div className="space-y-4">
                  {categoryGroups.map((g, i) => (
                    <div key={g.key}>
                      <button
                        type="button"
                        onClick={() => toggleCategory(g.key)}
                        className="w-full text-left group"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${g.color}`}>{g.label}</span>
                            <span className="text-xs text-gray-400">
                              {pct(g.amount, summary.subtotal)}%
                            </span>
                            <svg
                              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${expandedCategories.has(g.key) ? 'rotate-180' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{fmt(g.amount)}</span>
                        </div>
                        <AnimatedBar percentage={pct(g.amount, summary.subtotal)} colorClass={g.barColor} delay={i * 100 + 200} />
                      </button>

                      {/* Expanded items */}
                      {expandedCategories.has(g.key) && (
                        <div className="mt-2 ml-2 space-y-1 border-l-2 border-gray-100 pl-4 print:border-gray-300">
                          {g.items.map((li) => (
                            <div key={li.id} className="flex justify-between text-sm py-1">
                              <span className="text-gray-600 truncate mr-4">{li.description}</span>
                              <span className="text-gray-900 font-medium shrink-0">{fmt(li.extendedPrice)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">{fmt(summary.subtotal)}</span>
                  </div>
                  {summary.tax > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tax ({input.estimateControls.taxRate}%)</span>
                      <span className="font-medium text-gray-900">{fmt(summary.tax)}</span>
                    </div>
                  )}
                  {summary.contingency > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Contingency ({input.estimateControls.contingencyPercent}%)</span>
                      <span className="font-medium text-gray-900">{fmt(summary.contingency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-300">
                    <span className="text-base font-bold text-gray-900">Total</span>
                    <span className="text-base font-bold text-gray-900">{fmt(summary.total)}</span>
                  </div>
                </div>
              </section>

              {/* -------------------------------------------------------- */}
              {/*  C. Site Map                                             */}
              {/* -------------------------------------------------------- */}
              <section className="print:hidden">
                <SharedEstimateMapViewer key={id} input={output.input} />
              </section>

              {equipment.length > 0 && (
                <section className="print:hidden">
                  <ConceptualSiteOverlay equipment={equipment} />
                </section>
              )}

              {hasMapData && (
                <section className="lg-panel-heavy p-6 print:bg-white print:border print:border-gray-200 print:shadow-none">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Site Measurements</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {mapData!.conduitDistance_ft ? (
                      <div className="lg-card p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">{mapData!.conduitDistance_ft}<span className="text-sm font-normal text-gray-400">ft</span></p>
                        <p className="text-xs text-gray-500 mt-1">Conduit</p>
                      </div>
                    ) : null}
                    {mapData!.trenchingDistance_ft ? (
                      <div className="lg-card p-3 text-center">
                        <p className="text-2xl font-bold text-violet-600">{mapData!.trenchingDistance_ft}<span className="text-sm font-normal text-gray-400">ft</span></p>
                        <p className="text-xs text-gray-500 mt-1">Trenching</p>
                      </div>
                    ) : null}
                    {mapData!.boringDistance_ft ? (
                      <div className="lg-card p-3 text-center">
                        <p className="text-2xl font-bold text-amber-600">{mapData!.boringDistance_ft}<span className="text-sm font-normal text-gray-400">ft</span></p>
                        <p className="text-xs text-gray-500 mt-1">Boring</p>
                      </div>
                    ) : null}
                    {mapData!.chargerCountFromMap ? (
                      <div className="lg-card p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-600">{mapData!.chargerCountFromMap}</p>
                        <p className="text-xs text-gray-500 mt-1">Chargers (Map)</p>
                      </div>
                    ) : null}
                  </div>
                </section>
              )}

              {displayPreviewUrls.satelliteStaticUrl && (
                <section className="lg-panel-heavy overflow-hidden print:border print:border-gray-200">
                  <h3 className="px-5 pt-5 text-sm font-semibold text-gray-900">Satellite Preview</h3>
                  {/* eslint-disable-next-line @next/next/no-img-element -- external Mapbox static URL */}
                  <img
                    src={displayPreviewUrls.satelliteStaticUrl}
                    alt="Satellite preview of site"
                    className="mt-3 w-full max-h-80 object-cover"
                  />
                </section>
              )}

              {/* -------------------------------------------------------- */}
              {/*  D. Project Details                                      */}
              {/* -------------------------------------------------------- */}
              <section className="lg-panel-heavy p-6 print:bg-white print:border print:border-gray-200 print:shadow-none">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Project Details</h2>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  {[
                    { label: 'Project Type', value: formatProjectType(input.project.projectType) },
                    { label: 'Charger Brand', value: input.charger.brand || '---' },
                    { label: 'Charger Model', value: input.charger.model || '---' },
                    { label: 'Charger Count', value: String(input.charger.count) },
                    { label: 'Charging Level', value: input.charger.chargingLevel === 'l3_dcfc' ? 'Level 3 (DCFC)' : input.charger.chargingLevel === 'l2' ? 'Level 2' : '---' },
                    { label: 'Electrical Service', value: input.electrical.serviceType?.replace(/_/g, ' ').toUpperCase() ?? '---' },
                    { label: 'Parking Type', value: input.parkingEnvironment.type ? formatProjectType(input.parkingEnvironment.type) : '---' },
                    { label: 'Site Type', value: input.site.siteType ? formatProjectType(input.site.siteType) : '---' },
                    { label: 'Timeline', value: input.project.timeline || '---' },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-gray-400">{item.label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* -------------------------------------------------------- */}
              {/*  E. Line Items Table                                     */}
              {/* -------------------------------------------------------- */}
              <section className="lg-panel-heavy p-6 print:bg-white print:border print:border-gray-200 print:shadow-none">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    Line Items <span className="text-sm font-normal text-gray-400">({filteredItems.length})</span>
                  </h2>

                  {/* Search */}
                  <div className="relative print:hidden">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-48"
                    />
                  </div>
                </div>

                {/* Category filter pills */}
                <div className="flex flex-wrap gap-1.5 mb-4 print:hidden">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`lg-pill text-xs ${categoryFilter === 'all' ? 'lg-pill-active' : ''}`}
                  >
                    All
                  </button>
                  {categoryGroups.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setCategoryFilter(g.key)}
                      className={`lg-pill text-xs ${categoryFilter === g.key ? 'lg-pill-active' : ''}`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* Table */}
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                        <th
                          className="py-2.5 pr-3 cursor-pointer hover:text-gray-900 transition-colors select-none"
                          onClick={() => handleSort('description')}
                        >
                          Description {sortField === 'description' ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : <span className="opacity-30">{'\u2195'}</span>}
                        </th>
                        <th className="py-2.5 pr-3 w-20">Category</th>
                        <th
                          className="py-2.5 pr-3 w-16 cursor-pointer hover:text-gray-900 transition-colors select-none"
                          onClick={() => handleSort('quantity')}
                        >
                          Qty {sortField === 'quantity' ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : <span className="opacity-30">{'\u2195'}</span>}
                        </th>
                        <th
                          className="py-2.5 text-right w-28 cursor-pointer hover:text-gray-900 transition-colors select-none"
                          onClick={() => handleSort('extendedPrice')}
                        >
                          Amount {sortField === 'extendedPrice' ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : <span className="opacity-30">{'\u2195'}</span>}
                        </th>
                        <th className="py-2.5 w-8 print:hidden" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((li) => (
                        <Fragment key={li.id}>
                          <tr
                            className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors cursor-pointer print:hover:bg-transparent print:cursor-default"
                            onClick={() => toggleRow(li.id)}
                          >
                            <td className="py-2.5 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-800">{li.description}</span>
                                {li.manualReviewRequired && (
                                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" title="Manual review required" />
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 pr-3">
                              <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[0.6875rem] font-medium text-gray-600">
                                {li.category}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 text-gray-600">
                              {li.quantity} {li.unit}
                            </td>
                            <td className="py-2.5 text-right font-semibold text-gray-900">{fmt(li.extendedPrice)}</td>
                            <td className="py-2.5 text-center print:hidden">
                              <svg
                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedRows.has(li.id) ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </td>
                          </tr>
                          {expandedRows.has(li.id) && (
                            <tr className="bg-gray-50/50 print:bg-gray-50">
                              <td colSpan={5} className="px-4 py-3">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
                                  <div>
                                    <span className="text-gray-400 uppercase tracking-wider">Confidence</span>
                                    <div className="mt-1">
                                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${confidenceTextColor(li.confidence)}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${confidenceColor(li.confidence)}`} />
                                        {li.confidence}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 uppercase tracking-wider">Unit Price</span>
                                    <p className="mt-1 font-medium text-gray-800">{fmt(li.unitPrice)}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 uppercase tracking-wider">Pricing Source</span>
                                    <p className="mt-1 font-medium text-gray-800">{li.pricingSource.replace(/_/g, ' ')}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 uppercase tracking-wider">Rule</span>
                                    <p className="mt-1 font-medium text-gray-800">{li.ruleName}</p>
                                  </div>
                                  {li.ruleReason && (
                                    <div className="col-span-2 sm:col-span-4">
                                      <span className="text-gray-400 uppercase tracking-wider">Reason</span>
                                      <p className="mt-1 text-gray-700">{li.ruleReason}</p>
                                    </div>
                                  )}
                                  {li.manualReviewReason && (
                                    <div className="col-span-2 sm:col-span-4">
                                      <span className="text-amber-500 uppercase tracking-wider font-semibold">Review Required</span>
                                      <p className="mt-1 text-amber-800">{li.manualReviewReason}</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* -------------------------------------------------------- */}
              {/*  F. Exclusions & Manual Review Triggers                  */}
              {/* -------------------------------------------------------- */}
              {(exclusions.length > 0 || manualReviewTriggers.length > 0) && (
                <section className="lg-panel-heavy p-6 print:bg-white print:border print:border-gray-200 print:shadow-none">
                  {exclusions.length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">Exclusions</h2>
                      <div className="space-y-2">
                        {exclusions.map((ex) => (
                          <div key={ex.id} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                            <svg className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            <div>
                              <span className="font-semibold text-gray-800">{ex.category}:</span>{' '}
                              <span className="text-gray-600">{ex.text}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {manualReviewTriggers.length > 0 && (
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 mb-3">Manual Review Triggers</h2>
                      <div className="space-y-2">
                        {manualReviewTriggers.map((t) => (
                          <div key={t.id} className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${severityColor(t.severity)}`}>
                            <span className={`shrink-0 mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider border ${severityColor(t.severity)}`}>
                              {t.severity}
                            </span>
                            <div>
                              <p className="font-medium">{t.message}</p>
                              <p className="text-xs opacity-75 mt-0.5">{t.field}: {t.condition}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* ============================================================ */}
            {/*  RIGHT SIDEBAR (Chat)                                       */}
            {/* ============================================================ */}
            <div className="print:hidden">
              {/* Mobile toggle */}
              <button
                type="button"
                onClick={() => setShowChat((v) => !v)}
                className="lg:hidden w-full mb-3 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {showChat ? 'Hide Chat' : 'Ask about this estimate'}
              </button>

              {/* Chat - sticky on desktop */}
              {showChat && (
                <div className="lg:sticky lg:top-6">
                  <SharedEstimateChat shareId={id} output={output} />
                </div>
              )}
            </div>
          </div>

          {/* Footer disclaimer */}
          <p className="mt-12 text-center text-[0.6875rem] text-gray-400 print:text-gray-600 print:mt-8">
            For budgetary purposes only -- subject to site survey and engineering review.
            <br />
            Generated by BulletEV Estimation Engine v{metadata.engineVersion}
          </p>
        </main>
      </div>
    </>
  );
}


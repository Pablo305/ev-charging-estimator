'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { EstimateOutput, EstimateLineItem, ManualReviewTrigger } from '@/lib/estimate/types';
import { generateEstimate } from '@/lib/estimate/engine';
import { exportEstimatePDF, exportEstimatePDFWithPreviews } from '@/lib/estimate/export-pdf';
import { buildPreviewAssetsFromOutput } from '@/lib/map/static-preview-urls';
import { useEstimate } from '@/contexts/EstimateContext';
import { useAutoEstimate } from '@/hooks/useAutoEstimate';
import { LiveEstimateSummary } from '@/components/estimate/LiveEstimateSummary';
import { GuidedEstimateFlow } from '@/components/estimate/GuidedEstimateFlow';
import { LogoutButton } from '@/components/LogoutButton';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function EstimatePage() {
  const { input, resetEstimate } = useEstimate();
  const autoEstimate = useAutoEstimate();
  const [output, setOutput] = useState<EstimateOutput | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [proposalStatus, setProposalStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [proposalUrl, setProposalUrl] = useState<string | null>(null);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());

  const handleGenerate = useCallback(() => {
    setOutput(generateEstimate(input));
  }, [input]);

  const handleShareInteractive = useCallback(async () => {
    if (!output) return;
    setShareStatus('loading');
    try {
      const res = await fetch('/api/estimate/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ output }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Share failed');
      const url = `${window.location.origin}${data.url}`;
      await navigator.clipboard.writeText(url);
      setShareStatus('done');
      setTimeout(() => setShareStatus('idle'), 5000);
    } catch {
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 5000);
    }
  }, [output]);

  const handleShareProposal = useCallback(async () => {
    if (!output) return;
    setProposalStatus('loading');
    setProposalUrl(null);
    try {
      const res = await fetch('/api/estimate/share-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ output }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Create proposal failed');
      const full = `${window.location.origin}${data.url}`;
      setProposalUrl(full);
      await navigator.clipboard.writeText(full).catch(() => {});
      setProposalStatus('done');
    } catch {
      setProposalStatus('error');
      setTimeout(() => setProposalStatus('idle'), 5000);
    }
  }, [output]);

  const handleDownloadPdfWithPreviews = useCallback(async () => {
    if (!output) return;
    const previews = buildPreviewAssetsFromOutput(output);
    await exportEstimatePDFWithPreviews(output, previews);
  }, [output]);

  const toggleLine = useCallback((id: string) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <main className="relative min-h-screen pb-20">
      <div className="ambient-mesh" />
      <div className="mx-auto max-w-[1200px] px-5 pt-5 sm:px-6" style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <header className="hero-canvas lg-ring" style={{ borderRadius: 'var(--radius-xl)', padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
          <div className="relative flex items-center justify-between" style={{ zIndex: 1 }}>
            <Link href="/" className="text-white transition-opacity hover:opacity-80" aria-label="Go home">
              <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-white/50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                BulletEV
              </p>
              <h1 className="text-lg font-bold tracking-[-0.022em] sm:text-xl">Estimate Generator</h1>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/estimate/map"
                className="rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur hover:bg-white/20 transition-colors"
              >
                Map Takeoff Tool
              </Link>
              <button
                type="button"
                onClick={() => { resetEstimate(); setOutput(null); }}
                className="rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur hover:bg-white/20 transition-colors"
              >
                New Estimate
              </button>
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Guided Flow */}
        <div className="mt-6">
          <GuidedEstimateFlow onEstimateGenerated={handleGenerate} />
        </div>

        {/* Estimate Results */}
        {output && (
          <div className="mt-8">
            <EstimateResults
              output={output}
              expandedLines={expandedLines}
              toggleLine={toggleLine}
              onShareInteractive={handleShareInteractive}
              shareStatus={shareStatus}
              onShareProposal={handleShareProposal}
              proposalStatus={proposalStatus}
              proposalUrl={proposalUrl}
              onDownloadPdfWithPreviews={handleDownloadPdfWithPreviews}
            />
          </div>
        )}
      </div>

      <LiveEstimateSummary autoEstimate={autoEstimate} />
    </main>
  );
}

/* ── Badges ──────────────────────────────────────────────────── */

function PricingBadge({ source }: { source: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    catalog_bulk: { bg: 'rgba(52,199,89,0.1)', color: 'var(--system-green)' },
    catalog_msrp: { bg: 'rgba(52,199,89,0.1)', color: 'var(--system-green)' },
    calculated: { bg: 'rgba(0,122,255,0.08)', color: 'var(--system-blue)' },
    allowance: { bg: 'rgba(0,122,255,0.08)', color: 'var(--system-blue)' },
    industry_standard: { bg: 'rgba(255,149,0,0.1)', color: 'var(--system-orange)' },
    manual_override: { bg: 'rgba(175,82,222,0.1)', color: 'var(--system-purple)' },
    sow_import: { bg: 'rgba(88,86,214,0.12)', color: '#4338ca' },
    tbd: { bg: 'rgba(255,59,48,0.1)', color: 'var(--system-red)' },
  };
  const s = styles[source] ?? { bg: 'rgba(0,0,0,0.04)', color: '#636366' };
  return (
    <span className="inline-flex rounded-full px-2.5 py-1 text-[0.6875rem] font-medium" style={{ background: s.bg, color: s.color }}>
      {source.replace(/_/g, ' ')}
    </span>
  );
}

function ConfidenceDot({ level }: { level: string }) {
  const color = level === 'high' ? 'var(--system-green)' : level === 'medium' ? 'var(--system-orange)' : 'var(--system-red)';
  return <span className="lg-dot" style={{ background: color }} title={`Confidence: ${level}`} />;
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    critical: { bg: 'rgba(255,59,48,0.1)', color: 'var(--system-red)' },
    warning: { bg: 'rgba(255,149,0,0.1)', color: '#7a5a00' },
    info: { bg: 'rgba(0,122,255,0.08)', color: 'var(--system-blue)' },
  };
  const s = map[severity] ?? map.info;
  return <span className="inline-flex rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.04em]" style={{ background: s.bg, color: s.color }}>{severity}</span>;
}

/* ── Estimate Results ────────────────────────────────────────── */

function EstimateResults({ output, expandedLines, toggleLine, onShareInteractive, shareStatus, onShareProposal, proposalStatus, proposalUrl, onDownloadPdfWithPreviews }: {
  output: EstimateOutput; expandedLines: Set<string>; toggleLine: (id: string) => void;
  onShareInteractive: () => void;
  shareStatus: 'idle' | 'loading' | 'done' | 'error';
  onShareProposal: () => void;
  proposalStatus: 'idle' | 'loading' | 'done' | 'error';
  proposalUrl: string | null;
  onDownloadPdfWithPreviews: () => void;
}) {
  const { summary, metadata, lineItems, exclusions, manualReviewTriggers } = output;
  const byCategory = lineItems.reduce<Record<string, EstimateLineItem[]>>((acc, li) => ({
    ...acc, [li.category]: [...(acc[li.category] ?? []), li],
  }), {});

  return (
    <div id="estimate-output" className="space-y-4">

      {/* Header */}
      <div className="lg-panel-heavy p-5 sm:p-6" style={{ borderRadius: 'var(--radius-xl)' }}>
        <h2 className="text-xl font-bold tracking-[-0.022em] text-gray-900 sm:text-2xl">{output.input.project.name || 'Untitled Project'}</h2>
        <p className="mt-1 truncate text-[0.8125rem] text-gray-500">{output.input.customer.companyName} | {output.input.site.address}</p>
        <p className="mt-1 text-[0.6875rem] text-gray-400">Generated {new Date(metadata.generatedAt).toLocaleString()} | Engine {metadata.engineVersion}</p>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          {[
            { label: 'Completeness', value: `${metadata.inputCompleteness}%`, color: metadata.inputCompleteness >= 70 ? 'var(--system-green)' : metadata.inputCompleteness >= 40 ? 'var(--system-orange)' : 'var(--system-red)' },
            { label: 'Confidence', value: metadata.automationConfidence.toUpperCase(), color: metadata.automationConfidence === 'high' ? 'var(--system-green)' : metadata.automationConfidence === 'medium' ? 'var(--system-orange)' : 'var(--system-red)' },
            { label: 'Total', value: fmt(summary.total), color: '#1c1c1e' },
          ].map((item) => (
            <div key={item.label} className="px-3 py-2 sm:px-4" style={{ borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.03)' }}>
              <p className="text-[0.6875rem] text-gray-500">{item.label}</p>
              <p className="text-base font-bold sm:text-lg" style={{ color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap sm:gap-3">
          <button onClick={() => exportEstimatePDF(output)} className="lg-pill lg-pill-active px-5 py-2.5 text-[0.8125rem] font-semibold" style={{ background: '#1c1c1e' }}>
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => void onDownloadPdfWithPreviews()}
            className="lg-pill px-5 py-2.5 text-[0.8125rem] font-semibold text-gray-800"
            style={{ background: 'rgba(0,0,0,0.06)' }}
          >
            PDF + site images
          </button>
          <button
            type="button"
            onClick={() => void onShareInteractive()}
            disabled={shareStatus === 'loading'}
            className="lg-pill px-5 py-2.5 text-[0.8125rem] font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--system-blue)' }}
          >
            {shareStatus === 'loading' ? 'Creating link\u2026' : 'Share interactive estimate'}
          </button>
          {shareStatus === 'done' && (
            <span className="self-center text-[0.75rem] text-green-600">Link copied to clipboard</span>
          )}
          {shareStatus === 'error' && (
            <span className="self-center text-[0.75rem] text-red-600">Could not create link</span>
          )}
          <button
            type="button"
            onClick={() => void onShareProposal()}
            disabled={proposalStatus === 'loading'}
            className="lg-pill px-5 py-2.5 text-[0.8125rem] font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--system-purple)' }}
          >
            {proposalStatus === 'loading' ? 'Creating proposal\u2026' : 'Create customer proposal'}
          </button>
          {proposalStatus === 'error' && (
            <span className="self-center text-[0.75rem] text-red-600">Could not create proposal</span>
          )}
        </div>

        {proposalStatus === 'done' && proposalUrl && (
          <div className="mt-4 p-4" style={{ borderRadius: 'var(--radius-sm)', background: 'rgba(175,82,222,0.06)', border: '0.5px solid rgba(175,82,222,0.25)' }}>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-gray-500">
              Customer proposal link (copied to clipboard)
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <a
                href={proposalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-[0.8125rem] font-medium text-gray-900 underline decoration-purple-300 underline-offset-4 hover:decoration-purple-500"
              >
                {proposalUrl}
              </a>
              <button
                type="button"
                onClick={() => { void navigator.clipboard.writeText(proposalUrl); }}
                className="lg-pill self-start px-3 py-1 text-[0.6875rem] font-semibold text-gray-800 sm:self-center"
                style={{ background: 'rgba(0,0,0,0.06)' }}
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Review Triggers */}
      {manualReviewTriggers.length > 0 && (
        <div className="p-5 sm:p-6" style={{ borderRadius: 'var(--radius-lg)', background: 'rgba(255,149,0,0.06)', border: '0.5px solid rgba(255,149,0,0.15)' }}>
          <h3 className="text-base font-semibold sm:text-lg" style={{ color: '#7a5a00' }}>Manual Review Required ({manualReviewTriggers.length})</h3>
          <div className="mt-3 space-y-2">
            {manualReviewTriggers.map((trigger: ManualReviewTrigger) => (
              <div key={trigger.id} className="lg-card flex items-start gap-2 p-3 sm:gap-3 sm:p-4" style={{ borderRadius: 'var(--radius-md)' }}>
                <SeverityBadge severity={trigger.severity} />
                <div>
                  <p className="text-[0.8125rem] font-medium text-gray-900">{trigger.message}</p>
                  <p className="text-[0.6875rem] text-gray-500">Field: {trigger.field} | Condition: {trigger.condition}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Summary */}
      <div className="lg-panel p-5 sm:p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
        <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Cost Summary</h3>
        <div className="mt-3 grid gap-2 grid-cols-2 sm:mt-4 sm:grid-cols-3">
          {[
            { label: 'Hardware', value: summary.hardwareTotal },
            { label: 'Installation', value: summary.installationTotal },
            { label: 'Permit/Design', value: summary.permitDesignTotal },
            { label: 'Network', value: summary.networkTotal },
            { label: 'Accessories', value: summary.accessoriesTotal },
            { label: 'Service/Software', value: summary.serviceTotal },
          ].map((item) => (
            <div key={item.label} className="flex justify-between px-3.5 py-2" style={{ borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.03)' }}>
              <span className="text-[0.8125rem] text-gray-500">{item.label}</span>
              <span className="text-[0.8125rem] font-medium text-gray-900">{fmt(item.value)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 pt-4" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
          <div className="flex justify-between gap-2"><span className="text-[0.75rem] text-gray-500 sm:text-[0.8125rem]">Subtotal ({output.input.estimateControls.markupPercent}% markup)</span><span className="text-[0.75rem] font-medium sm:text-[0.8125rem]">{fmt(summary.subtotal)}</span></div>
          <div className="flex justify-between gap-2"><span className="text-[0.75rem] text-gray-500 sm:text-[0.8125rem]">Tax ({output.input.estimateControls.taxRate}%)</span><span className="text-[0.75rem] font-medium sm:text-[0.8125rem]">{fmt(summary.tax)}</span></div>
          <div className="flex justify-between gap-2"><span className="text-[0.75rem] text-gray-500 sm:text-[0.8125rem]">Contingency ({output.input.estimateControls.contingencyPercent}%)</span><span className="text-[0.75rem] font-medium sm:text-[0.8125rem]">{fmt(summary.contingency)}</span></div>
          <div className="flex justify-between gap-2 pt-2" style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)' }}><span className="text-[0.875rem] font-semibold text-gray-900 sm:text-base">Total</span><span className="text-[0.875rem] font-bold text-gray-900 sm:text-base">{fmt(summary.total)}</span></div>
        </div>
      </div>

      {/* Line Items */}
      <div className="lg-panel overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div className="px-5 py-3.5 sm:px-6 sm:py-4" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
          <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Line Items ({lineItems.length})</h3>
        </div>
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[600px] text-[0.8125rem] sm:min-w-0">
            <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
              <tr className="text-left text-[0.6875rem] uppercase tracking-[0.04em] text-gray-400">
                <th className="hidden px-4 py-3 sm:table-cell">ID</th>
                <th className="hidden px-4 py-3 sm:table-cell">Category</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3">Description</th>
                <th className="px-3 py-2.5 text-right sm:px-4 sm:py-3">Qty</th>
                <th className="hidden px-4 py-3 sm:table-cell">Unit</th>
                <th className="hidden px-4 py-3 text-right lg:table-cell">Unit Price</th>
                <th className="px-3 py-2.5 text-right sm:px-4 sm:py-3">Ext. Price</th>
                <th className="hidden px-4 py-3 md:table-cell">Source</th>
                <th className="hidden px-4 py-3 text-center md:table-cell">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byCategory).map(([cat, items]) => (
                <CategoryGroup key={cat} category={cat} items={items} expandedLines={expandedLines} toggleLine={toggleLine} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exclusions */}
      <div className="lg-panel p-5 sm:p-6" style={{ borderRadius: 'var(--radius-lg)' }}>
        <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Exclusions ({exclusions.length})</h3>
        <ul className="mt-3 space-y-2">
          {exclusions.map((ex) => (
            <li key={ex.id} className="flex items-start gap-2 text-[0.75rem] sm:text-[0.8125rem]">
              <span className="mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-medium" style={{ background: 'rgba(0,0,0,0.04)', color: '#636366' }}>{ex.category}</span>
              <span className="text-gray-600">{ex.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CategoryGroup({ category, items, expandedLines, toggleLine }: {
  category: string; items: EstimateLineItem[]; expandedLines: Set<string>; toggleLine: (id: string) => void;
}) {
  const catTotal = items.reduce((s, li) => s + li.extendedPrice, 0);
  return (
    <>
      <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
        <td colSpan={9} className="px-3 py-2.5 sm:px-4">
          <div className="flex items-center justify-between">
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.04em] text-gray-500">{category}</span>
            <span className="text-[0.6875rem] font-bold text-gray-600">{fmt(catTotal)}</span>
          </div>
        </td>
      </tr>
      {items.map((li, idx) => (
        <LineItemRow key={li.id} item={li} isOdd={idx % 2 === 1} expanded={expandedLines.has(li.id)} onToggle={() => toggleLine(li.id)} />
      ))}
    </>
  );
}

function LineItemRow({ item, isOdd, expanded, onToggle }: {
  item: EstimateLineItem; isOdd: boolean; expanded: boolean; onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer transition"
        onClick={onToggle}
        style={{
          background: isOdd ? 'rgba(0,0,0,0.015)' : 'transparent',
          borderLeft: item.manualReviewRequired ? '3px solid var(--system-orange)' : 'none',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,122,255,0.04)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isOdd ? 'rgba(0,0,0,0.015)' : 'transparent'; }}
      >
        <td className="hidden px-4 py-2.5 text-[0.75rem] text-gray-400 sm:table-cell">{item.id}</td>
        <td className="hidden px-4 py-2.5 text-[0.75rem] text-gray-400 sm:table-cell">{item.category}</td>
        <td className="px-3 py-2.5 text-gray-900 sm:px-4">
          <svg className={`inline-block h-3.5 w-3.5 mr-1.5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" /></svg>
          {item.description}
          {item.manualReviewRequired && (
            <span className="ml-1 inline-flex rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase sm:ml-2" style={{ background: 'rgba(255,149,0,0.1)', color: 'var(--system-orange)' }}>review</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-right sm:px-4">{item.quantity}</td>
        <td className="hidden px-4 py-2.5 text-[0.75rem] text-gray-400 sm:table-cell">{item.unit}</td>
        <td className="hidden px-4 py-2.5 text-right lg:table-cell">{fmt(item.unitPrice)}</td>
        <td className="px-3 py-2.5 text-right font-medium sm:px-4">{fmt(item.extendedPrice)}</td>
        <td className="hidden px-4 py-2.5 md:table-cell"><PricingBadge source={item.pricingSource} /></td>
        <td className="hidden px-4 py-2.5 text-center md:table-cell"><ConfidenceDot level={item.confidence} /></td>
      </tr>
      {expanded && (
        <tr style={{ background: 'rgba(0,122,255,0.03)' }}>
          <td colSpan={9} className="px-4 py-3.5 sm:px-6 sm:py-4">
            <div className="space-y-1.5 text-[0.75rem] sm:space-y-2 sm:text-[0.8125rem]">
              <p><span className="font-medium text-gray-700">Rule:</span> <span className="font-mono text-[0.6875rem] text-gray-400">{item.ruleName}</span></p>
              <p><span className="font-medium text-gray-700">Why this line?</span> {item.ruleReason}</p>
              <p><span className="font-medium text-gray-700">Source Inputs:</span> {item.sourceInputs.join(', ')}</p>
              {item.manualReviewReason && (
                <p style={{ color: 'var(--system-orange)' }}><span className="font-medium">Review Reason:</span> {item.manualReviewReason}</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

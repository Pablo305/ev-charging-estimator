'use client';

import { Suspense, useState, useCallback, useEffect, useMemo, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { EstimateInput, EstimateOutput, EstimateLineItem, ManualReviewTrigger } from '@/lib/estimate/types';
import { generateEstimate } from '@/lib/estimate/engine';
import { exportEstimatePDF } from '@/lib/estimate/export-pdf';
import { SCENARIOS } from '@/lib/estimate/scenarios';
import { useViewMode } from '@/lib/viewMode';
import { useEstimate } from '@/contexts/EstimateContext';
import { MAP_WORKSPACE_ENABLED } from '@/lib/map/feature-flags';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { SOWParser } from '@/components/advanced/SOWParser';
import { ChatBuilder } from '@/components/advanced/ChatBuilder';
import { AIReviewer } from '@/components/advanced/AIReviewer';
import { PhotoAnalysis } from '@/components/advanced/PhotoAnalysis';
import {
  ProjectSection, CustomerSection, SiteSection, ParkingSection,
  ChargerSection, ElectricalSection, CivilSection, PermitSection,
  NetworkSection, AccessoriesSection, ResponsibilitiesSection, PricingSection,
} from '@/components/estimate/sections';
import { useAutoEstimate } from '@/hooks/useAutoEstimate';
import { LiveEstimateSummary } from '@/components/estimate/LiveEstimateSummary';
import { OnboardingWizard } from '@/components/estimate/OnboardingWizard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { emptyInput } from '@/lib/estimate/emptyInput';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const TAB_META: Record<string, { icon: string; description: string; required: string[] }> = {
  'Project': { icon: '1', description: 'Basic project info and type of work', required: ['project.name', 'project.projectType'] },
  'Customer': { icon: '2', description: 'Client contact and billing details', required: ['customer.companyName'] },
  'Site': { icon: '3', description: 'Physical location and site classification', required: ['site.address', 'site.state'] },
  'Parking': { icon: '4', description: 'Parking lot conditions and access requirements', required: [] },
  'Charger': { icon: '5', description: 'EV charger specs — brand, model, quantity, power', required: ['charger.brand', 'charger.count', 'charger.chargingLevel'] },
  'Electrical': { icon: '6', description: 'Existing electrical infrastructure and upgrade needs', required: [] },
  'Civil': { icon: '7', description: 'Site work and trenching details', required: [] },
  'Permit/Design': { icon: '8', description: 'Permitting responsibilities and engineering plans', required: [] },
  'Network': { icon: '9', description: 'Connectivity for charger management', required: [] },
  'Accessories': { icon: '10', description: 'Bollards, signs, striping, pads', required: [] },
  'Responsibilities': { icon: '11', description: 'Who handles what — Bullet vs Client', required: [] },
  'Controls': { icon: '12', description: 'Pricing tier, tax rate, markup, contingency', required: [] },
};

const TABS = Object.keys(TAB_META) as (keyof typeof TAB_META)[];
type TabName = (typeof TABS)[number];

function getFieldValue(input: EstimateInput, path: string): unknown {
  const parts = path.split('.');
  let obj: unknown = input;
  for (const part of parts) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return undefined;
    obj = (obj as Record<string, unknown>)[part];
  }
  return obj;
}

function isFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return value > 0;
  return true;
}

function getTabStatus(tab: string, input: EstimateInput): 'empty' | 'partial' | 'complete' {
  const meta = TAB_META[tab];
  if (!meta) return 'empty';
  const sectionMap: Record<string, string> = {
    'Project': 'project', 'Customer': 'customer', 'Site': 'site',
    'Parking': 'parkingEnvironment', 'Charger': 'charger', 'Electrical': 'electrical',
    'Civil': 'civil', 'Permit/Design': 'permit', 'Network': 'network',
    'Accessories': 'accessories', 'Responsibilities': 'makeReady', 'Controls': 'estimateControls',
  };
  const section = sectionMap[tab];
  const sectionData = section ? (input as unknown as Record<string, unknown>)[section] : null;
  let filledCount = 0;
  let totalCount = 0;
  if (sectionData && typeof sectionData === 'object') {
    for (const val of Object.values(sectionData as Record<string, unknown>)) {
      totalCount++;
      if (isFieldFilled(val)) filledCount++;
    }
  }
  const requiredFilled = meta.required.length === 0 || meta.required.every(
    (path) => isFieldFilled(getFieldValue(input, path))
  );
  if (requiredFilled && filledCount > 0 && filledCount >= totalCount * 0.5) return 'complete';
  if (filledCount > 0) return 'partial';
  return 'empty';
}

function getOverallProgress(input: EstimateInput): number {
  const allRequired = Object.values(TAB_META).flatMap((m) => m.required);
  if (allRequired.length === 0) return 100;
  const filled = allRequired.filter((f) => isFieldFilled(getFieldValue(input, f))).length;
  return Math.round((filled / allRequired.length) * 100);
}

const SECTION_MAP: Record<string, React.ComponentType> = {
  'Project': ProjectSection, 'Customer': CustomerSection, 'Site': SiteSection,
  'Parking': ParkingSection, 'Charger': ChargerSection, 'Electrical': ElectricalSection,
  'Civil': CivilSection, 'Permit/Design': PermitSection, 'Network': NetworkSection,
  'Accessories': AccessoriesSection, 'Responsibilities': ResponsibilitiesSection,
  'Controls': PricingSection,
};

function SectionRenderer({ tab }: { tab: string }) {
  const Component = SECTION_MAP[tab];
  if (!Component) return null;
  return <Component />;
}

/** Reads `?tab=` from the URL (client navigations). Wrapped separately so the page can use Suspense per Next.js. */
function TabSyncFromUrl({ setActiveTab }: { setActiveTab: (t: TabName) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && TABS.includes(tabParam as TabName)) {
      setActiveTab(tabParam as TabName);
    }
  }, [searchParams, setActiveTab]);
  return null;
}

export default function EstimatePage() {
  const router = useRouter();
  const { isAdvanced } = useViewMode();
  const { input, updateField, applyPatches, setInput, resetEstimate, lastSavedAt } = useEstimate();
  const autoEstimate = useAutoEstimate();
  const [output, setOutput] = useState<EstimateOutput | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('Project');
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [inputMode, setInputMode] = useState<'form' | 'chat'>('form');
  const [aiStatus, setAiStatus] = useState<{ openai: boolean; gemini: boolean } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const isEstimateEmpty = useMemo(() => {
    return !input.project.name && !input.customer.companyName && !input.site.address && input.charger.count === 0;
  }, [input.project.name, input.customer.companyName, input.site.address, input.charger.count]);

  const handleEntrySelect = useCallback((entry: 'sow' | 'chat' | 'map' | 'form') => {
    setShowOnboarding(false);
    if (entry === 'chat') setInputMode('chat');
    else if (entry === 'map') router.push('/estimate/map');
  }, [router]);

  useEffect(() => {
    if (!isAdvanced) return;
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((data) => setAiStatus(data))
      .catch(() => setAiStatus({ openai: false, gemini: false }));
  }, [isAdvanced]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scenarioId = params.get('scenario');
    if (scenarioId) {
      const found = SCENARIOS.find((s) => s.id === scenarioId);
      if (found) setInput(found.input);
    }
  }, [setInput]);

  const loadScenario = useCallback((id: string) => {
    const found = SCENARIOS.find((s) => s.id === id);
    if (found) {
      setInput(found.input);
      setOutput(null);
      const url = new URL(window.location.href);
      url.searchParams.set('scenario', id);
      window.history.replaceState({}, '', url.toString());
    }
  }, [setInput]);

  const handleGenerate = useCallback(() => {
    setOutput(generateEstimate(input));
  }, [input]);

  const toggleLine = useCallback((id: string) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const applyFlatFields = useCallback((fields: Record<string, unknown>) => {
    applyPatches(Object.entries(fields).map(([fieldPath, value]) => ({ fieldPath, value })));
  }, [applyPatches]);

  const progress = useMemo(() => getOverallProgress(input), [input]);
  const tabStatuses = useMemo(() => {
    const result: Record<string, 'empty' | 'partial' | 'complete'> = {};
    for (const tab of TABS) result[tab] = getTabStatus(tab, input);
    return result;
  }, [input]);
  const currentTabIdx = TABS.indexOf(activeTab);

  const goNext = useCallback(() => {
    if (currentTabIdx < TABS.length - 1) setActiveTab(TABS[currentTabIdx + 1]);
  }, [currentTabIdx]);
  const goPrev = useCallback(() => {
    if (currentTabIdx > 0) setActiveTab(TABS[currentTabIdx - 1]);
  }, [currentTabIdx]);

  const handleTabKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, tab: TabName) => {
    const idx = TABS.indexOf(tab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (idx > 0) setActiveTab(TABS[idx - 1]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveTab(TABS[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveTab(TABS[TABS.length - 1]);
    }
  }, []);

  return (
    <main className="relative min-h-screen pb-20">
      <Suspense fallback={null}>
        <TabSyncFromUrl setActiveTab={setActiveTab} />
      </Suspense>
      <div className="ambient-mesh" />

      <div className="mx-auto max-w-[1200px] px-5 pt-5 sm:px-6" style={{ position: 'relative', zIndex: 1 }}>

        {/* ─── Header ────────────────────────────────────────── */}
        <header className="hero-canvas lg-ring" style={{ borderRadius: 'var(--radius-xl)', padding: 'clamp(1.25rem, 2.5vw, 2rem) clamp(1.25rem, 2.5vw, 2rem)' }}>
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" style={{ zIndex: 1 }}>
            <div className="text-white">
              <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-white/50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                BulletEV Estimate Studio
              </p>
              <h1 className="mt-2 text-xl font-bold tracking-[-0.022em] sm:text-2xl lg:text-3xl">
                <span className="lg-gradient-text">Guided Estimate</span>
              </h1>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {MAP_WORKSPACE_ENABLED && (
                <Link href="/estimate/map" className="lg-pill lg-pill-active px-4 py-2 text-[0.8125rem] font-semibold">
                  Map Workspace
                </Link>
              )}
              <ViewModeToggle />
              <Link href="/" className="lg-pill border-white/15 bg-white/10 px-4 py-2 text-[0.8125rem] font-medium text-white">
                Home
              </Link>
            </div>
          </div>
        </header>

        {/* ─── Progress Bar ──────────────────────────────────── */}
        <div className="mt-4 print:hidden">
          <div className="lg-panel-heavy p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-3">
                <span className="text-[0.8125rem] font-medium text-gray-700">Estimate Progress</span>
                <span className="lg-pill px-2.5 py-1 text-[0.6875rem] font-bold" style={{
                  background: progress >= 80 ? 'rgba(52,199,89,0.1)' : progress >= 40 ? 'rgba(255,149,0,0.1)' : 'rgba(0,0,0,0.03)',
                  color: progress >= 80 ? 'var(--system-green)' : progress >= 40 ? 'var(--system-orange)' : '#8e8e93',
                }}>{progress}%</span>
                {lastSavedAt && (
                  <span className="text-[0.6875rem] text-gray-400">Saved {lastSavedAt}</span>
                )}
              </div>
              <span className="text-[0.75rem] text-gray-400">
                Step {currentTabIdx + 1}/{TABS.length}: {activeTab}
              </span>
            </div>
            <div className="flex gap-1">
              {TABS.map((tab, i) => {
                const status = tabStatuses[tab];
                const isCurrent = tab === activeTab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    title={`${tab}: ${status}`}
                    className="h-2 flex-1 transition-all"
                    style={{
                      borderRadius: 999,
                      background: isCurrent
                        ? 'var(--system-blue)'
                        : status === 'complete'
                          ? 'var(--system-green)'
                          : status === 'partial'
                            ? 'var(--system-orange)'
                            : i <= currentTabIdx
                              ? 'rgba(0,0,0,0.15)'
                              : 'rgba(0,0,0,0.06)',
                      boxShadow: isCurrent ? '0 0 0 2px rgba(0,122,255,0.3)' : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Onboarding ────────────────────────────────────── */}
        {showOnboarding && isEstimateEmpty && (
          <div className="mt-4">
            <div className="lg-panel-heavy" style={{ borderRadius: 'var(--radius-xl)' }}>
              <OnboardingWizard onEntrySelect={handleEntrySelect} />
            </div>
          </div>
        )}

        {/* ─── AI Status Banner ──────────────────────────────── */}
        {isAdvanced && aiStatus && (!aiStatus.openai || !aiStatus.gemini) && (
          <div className="mt-4 p-4 text-[0.8125rem] print:hidden" style={{ borderRadius: 'var(--radius-md)', background: 'rgba(255,149,0,0.08)', border: '0.5px solid rgba(255,149,0,0.2)', color: '#7a5a00' }}>
            <strong>AI features partially available:</strong>{' '}
            {!aiStatus.openai && !aiStatus.gemini
              ? 'No AI API keys configured. SOW Parser, Chat Builder, AI Reviewer, and Photo Analysis require OPENAI_API_KEY and GEMINI_API_KEY.'
              : !aiStatus.openai
                ? 'OPENAI_API_KEY not set — SOW Parser, Chat Builder, and AI Reviewer unavailable.'
                : 'GEMINI_API_KEY not set — Photo Analysis unavailable.'}
          </div>
        )}

        {/* ─── Quick Start ───────────────────────────────────── */}
        <div className={`mt-4 flex flex-wrap items-center gap-3 print:hidden ${showOnboarding && isEstimateEmpty ? 'hidden' : ''}`}>
          <span className="text-[0.8125rem] font-medium text-gray-500">Quick Start:</span>
          <select
            className="rounded-[var(--radius-sm)] border-0 bg-black/[0.03] px-3 py-2 text-[0.8125rem] ring-1 ring-inset ring-black/[0.06] focus:ring-2 focus:ring-[var(--system-blue)]"
            defaultValue=""
            onChange={(e) => { if (e.target.value) loadScenario(e.target.value); }}
          >
            <option value="">Load a sample scenario...</option>
            {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button
            onClick={() => {
              if (window.confirm('Clear all estimate data? This cannot be undone.')) {
                resetEstimate();
                setOutput(null);
              }
            }}
            className="lg-pill text-[0.8125rem] text-gray-600"
          >
            Clear All
          </button>
        </div>

        {/* ─── Advanced AI Tools ──────────────────────────────── */}
        {isAdvanced && !(showOnboarding && isEstimateEmpty) && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 print:hidden">
            <SOWParser onApplyFields={applyFlatFields} />
            <PhotoAnalysis onApplyFields={applyFlatFields} />
          </div>
        )}

        {/* ─── Input Mode Toggle ─────────────────────────────── */}
        {isAdvanced && !(showOnboarding && isEstimateEmpty) && (
          <div className="mt-4 flex gap-2 print:hidden">
            <button
              onClick={() => setInputMode('form')}
              className={`lg-pill px-4 py-2 text-[0.8125rem] font-semibold ${inputMode === 'form' ? 'lg-pill-active' : 'text-gray-600'}`}
            >
              Form Input
            </button>
            <button
              onClick={() => setInputMode('chat')}
              className={`lg-pill px-4 py-2 text-[0.8125rem] font-semibold ${inputMode === 'chat' ? 'lg-pill-active' : 'text-gray-600'}`}
              style={inputMode === 'chat' ? { background: 'var(--system-green)' } : {}}
            >
              Chat Builder
            </button>
          </div>
        )}

        {/* ─── Chat Builder ──────────────────────────────────── */}
        {isAdvanced && inputMode === 'chat' && !(showOnboarding && isEstimateEmpty) && (
          <div className="mt-4 print:hidden">
            <ChatBuilder currentInput={input} onApplyFields={applyFlatFields} onGenerateEstimate={handleGenerate} />
          </div>
        )}

        {/* ─── Form Panel ────────────────────────────────────── */}
        <div className={`mt-4 print:hidden ${(isAdvanced && inputMode === 'chat') || (showOnboarding && isEstimateEmpty) ? 'hidden' : ''}`}>
          <div className="lg-panel-heavy overflow-hidden" style={{ borderRadius: 'var(--radius-xl)' }}>

            {/* Tab Bar */}
            <div role="tablist" className="flex gap-0 overflow-x-auto scrollbar-none" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: 'rgba(0,0,0,0.02)' }}>
              {TABS.map((tab) => {
                const status = tabStatuses[tab];
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls="estimate-tab-panel"
                    tabIndex={activeTab === tab ? 0 : -1}
                    onKeyDown={(e) => handleTabKeyDown(e, tab)}
                    onClick={() => setActiveTab(tab)}
                    className="relative flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-3 text-[0.8125rem] font-medium transition"
                    style={{
                      color: activeTab === tab ? 'var(--system-blue)' : '#636366',
                      borderBottom: activeTab === tab ? '2px solid var(--system-blue)' : '2px solid transparent',
                      background: activeTab === tab ? 'rgba(0,122,255,0.04)' : 'transparent',
                    }}
                  >
                    {status === 'complete' && <span className="lg-dot" style={{ width: 6, height: 6, background: 'var(--system-green)' }} />}
                    {status === 'partial' && <span className="lg-dot" style={{ width: 6, height: 6, background: 'var(--system-orange)' }} />}
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Section Header */}
            <div className="px-5 py-3.5 sm:px-6" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.04)', background: 'rgba(0,122,255,0.02)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[0.9375rem] font-semibold text-gray-900">{activeTab}</h2>
                  <p className="mt-0.5 text-[0.75rem] text-gray-400">{TAB_META[activeTab]?.description}</p>
                </div>
                {TAB_META[activeTab]?.required.length > 0 && (
                  <span className="lg-pill px-2.5 py-1 text-[0.6875rem] font-medium" style={{ background: 'rgba(0,122,255,0.06)', color: 'var(--system-blue)' }}>
                    {TAB_META[activeTab].required.filter(f => isFieldFilled(getFieldValue(input, f))).length}/{TAB_META[activeTab].required.length} required
                  </span>
                )}
              </div>
            </div>

            {/* Tab Content */}
            <div id="estimate-tab-panel" role="tabpanel" className="p-5 sm:p-6">
              <ErrorBoundary fallbackLabel={activeTab}>
                <SectionRenderer tab={activeTab} />
              </ErrorBoundary>
            </div>

            {/* Navigation Footer */}
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)', background: 'rgba(0,0,0,0.02)' }}>
              <div className="flex gap-2">
                <button onClick={goPrev} disabled={currentTabIdx === 0} className="lg-pill px-4 py-2 text-[0.8125rem] font-medium text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                  &larr; Previous
                </button>
                <button onClick={goNext} disabled={currentTabIdx === TABS.length - 1} className="lg-pill px-4 py-2 text-[0.8125rem] font-medium text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                  Next &rarr;
                </button>
              </div>
              <div className="flex w-full items-center gap-3 sm:w-auto">
                {progress < 40 && <span className="hidden text-[0.75rem] text-gray-400 sm:inline">Fill key fields to improve accuracy</span>}
                {progress >= 40 && progress < 80 && <span className="hidden text-[0.75rem] sm:inline" style={{ color: 'var(--system-orange)' }}>Good progress — more detail = better estimate</span>}
                {progress >= 80 && <span className="hidden text-[0.75rem] sm:inline" style={{ color: 'var(--system-green)' }}>Ready for a high-confidence estimate</span>}
                <button
                  onClick={handleGenerate}
                  className="lg-pill lg-pill-active w-full px-6 py-2.5 text-[0.8125rem] font-semibold sm:w-auto"
                  style={{ background: progress >= 40 ? 'var(--system-blue)' : '#8e8e93' }}
                >
                  Generate Estimate
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Results ───────────────────────────────────────── */}
        {output && (
          <div className="mt-6">
            <EstimateResults output={output} expandedLines={expandedLines} toggleLine={toggleLine} />
            {isAdvanced && (
              <div className="mt-6 print:hidden">
                <AIReviewer input={input} output={output} onApplyChange={(field, value) => updateField(field, value)} />
              </div>
            )}
          </div>
        )}
      </div>

      <LiveEstimateSummary autoEstimate={autoEstimate} />
    </main>
  );
}

/* ─── Badges ─────────────────────────────────────────────────── */

function PricingBadge({ source }: { source: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    catalog_bulk: { bg: 'rgba(52,199,89,0.1)', color: 'var(--system-green)' },
    catalog_msrp: { bg: 'rgba(52,199,89,0.1)', color: 'var(--system-green)' },
    calculated: { bg: 'rgba(0,122,255,0.08)', color: 'var(--system-blue)' },
    allowance: { bg: 'rgba(0,122,255,0.08)', color: 'var(--system-blue)' },
    industry_standard: { bg: 'rgba(255,149,0,0.1)', color: 'var(--system-orange)' },
    manual_override: { bg: 'rgba(175,82,222,0.1)', color: 'var(--system-purple)' },
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

/* ─── Estimate Results ───────────────────────────────────────── */

const CATEGORY_TO_TAB: Record<string, string> = {
  'CHARGER': 'Charger', 'PEDESTAL': 'Charger', 'CIVIL': 'Civil',
  'DES/ENG': 'Permit/Design', 'ELEC LBR': 'Electrical', 'ELEC MAT': 'Electrical',
  'ELEC LBR MAT': 'Electrical', 'ELEC': 'Electrical', 'MATERIAL': 'Accessories',
  'NETWORK': 'Network', 'PERMIT': 'Permit/Design', 'SAFETY': 'Parking',
  'SITE_WORK': 'Civil', 'SOFTWARE': 'Controls', 'SERVICE_FEE': 'Controls',
};

function EstimateResults({ output, expandedLines, toggleLine }: {
  output: EstimateOutput; expandedLines: Set<string>; toggleLine: (id: string) => void;
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

        <div className="mt-4 flex flex-col gap-2 print:hidden sm:flex-row sm:gap-3">
          <button onClick={() => exportEstimatePDF(output)} className="lg-pill lg-pill-active px-5 py-2.5 text-[0.8125rem] font-semibold" style={{ background: '#1c1c1e' }}>
            Download PDF
          </button>
          {MAP_WORKSPACE_ENABLED && (
            <Link href="/estimate/map" className="lg-pill lg-pill-active px-5 py-2.5 text-center text-[0.8125rem] font-semibold">
              Open Map Workspace
            </Link>
          )}
        </div>
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
            <span className="flex items-center">
              <span className="text-[0.6875rem] font-bold text-gray-600">{fmt(catTotal)}</span>
              <a
                href={`/estimate?tab=${encodeURIComponent(CATEGORY_TO_TAB[category] ?? 'Project')}`}
                className="ml-2 text-[0.6875rem] font-medium hover:underline"
                style={{ color: 'var(--system-blue)' }}
              >
                Edit
              </a>
            </span>
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

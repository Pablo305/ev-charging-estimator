'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

// ============================================================
// Helpers
// ============================================================

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// ============================================================
// Tabs with metadata
// ============================================================

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

// ============================================================
// Tab completion checker
// ============================================================

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
  const criticalFields = [
    'project.name', 'project.projectType', 'customer.companyName',
    'site.address', 'site.state', 'charger.brand', 'charger.count',
    'charger.chargingLevel', 'charger.model',
  ];
  const filled = criticalFields.filter((f) => isFieldFilled(getFieldValue(input, f))).length;
  return Math.round((filled / criticalFields.length) * 100);
}

// ============================================================
// Badges
// ============================================================

function PricingBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    catalog_bulk: 'bg-green-100 text-green-800',
    catalog_msrp: 'bg-green-100 text-green-800',
    calculated: 'bg-blue-100 text-blue-800',
    allowance: 'bg-blue-100 text-blue-800',
    industry_standard: 'bg-yellow-100 text-yellow-800',
    manual_override: 'bg-purple-100 text-purple-800',
    tbd: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colors[source] ?? 'bg-gray-100 text-gray-600'}`}>
      {source.replace(/_/g, ' ')}
    </span>
  );
}

function ConfidenceDot({ level }: { level: string }) {
  const c = level === 'high' ? 'bg-green-500' : level === 'medium' ? 'bg-yellow-500' : 'bg-red-500';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} title={`Confidence: ${level}`} />;
}

function SeverityBadge({ severity }: { severity: string }) {
  const c = severity === 'critical' ? 'bg-red-100 text-red-800 border-red-300'
    : severity === 'warning' ? 'bg-amber-100 text-amber-800 border-amber-300'
    : 'bg-blue-100 text-blue-800 border-blue-300';
  return <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${c}`}>{severity}</span>;
}

// ============================================================
// Section Renderer — maps tab names to extracted components
// ============================================================

const SECTION_MAP: Record<string, React.ComponentType> = {
  'Project': ProjectSection,
  'Customer': CustomerSection,
  'Site': SiteSection,
  'Parking': ParkingSection,
  'Charger': ChargerSection,
  'Electrical': ElectricalSection,
  'Civil': CivilSection,
  'Permit/Design': PermitSection,
  'Network': NetworkSection,
  'Accessories': AccessoriesSection,
  'Responsibilities': ResponsibilitiesSection,
  'Controls': PricingSection,
};

function SectionRenderer({ tab }: { tab: string }) {
  const Component = SECTION_MAP[tab];
  if (!Component) return null;
  return <Component />;
}

// ============================================================
// Main Page
// ============================================================

export default function EstimatePage() {
  const router = useRouter();
  const { isAdvanced } = useViewMode();
  const { input, updateField, applyPatches, setInput, resetEstimate } = useEstimate();
  const autoEstimate = useAutoEstimate();
  const [output, setOutput] = useState<EstimateOutput | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('Project');
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [inputMode, setInputMode] = useState<'form' | 'chat'>('form');
  const [aiStatus, setAiStatus] = useState<{ openai: boolean; gemini: boolean } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Detect if estimate is essentially empty (for onboarding)
  const isEstimateEmpty = useMemo(() => {
    return !input.project.name && !input.customer.companyName && !input.site.address && input.charger.count === 0;
  }, [input.project.name, input.customer.companyName, input.site.address, input.charger.count]);

  const handleEntrySelect = useCallback((entry: 'sow' | 'chat' | 'map' | 'form') => {
    setShowOnboarding(false);
    if (entry === 'chat') {
      setInputMode('chat');
    } else if (entry === 'map') {
      router.push('/estimate/map');
    } else if (entry === 'sow') {
      // SOW parser is already visible in advanced mode, just switch to form
      setInputMode('form');
    }
    // 'form' just dismisses wizard
  }, [router]);

  // Check AI availability when Advanced mode is active
  useEffect(() => {
    if (!isAdvanced) return;
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((data) => setAiStatus(data))
      .catch(() => setAiStatus({ openai: false, gemini: false }));
  }, [isAdvanced]);

  // URL param scenario loading
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scenarioId = params.get('scenario');
    if (scenarioId) {
      const found = SCENARIOS.find((s) => s.id === scenarioId);
      if (found) {
        setInput(found.input);
      }
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
    const result = generateEstimate(input);
    setOutput(result);
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
    applyPatches(
      Object.entries(fields).map(([fieldPath, value]) => ({ fieldPath, value }))
    );
  }, [applyPatches]);

  const progress = useMemo(() => getOverallProgress(input), [input]);
  const tabStatuses = useMemo(() => {
    const result: Record<string, 'empty' | 'partial' | 'complete'> = {};
    for (const tab of TABS) {
      result[tab] = getTabStatus(tab, input);
    }
    return result;
  }, [input]);
  const currentTabIdx = TABS.indexOf(activeTab);

  const goNext = useCallback(() => {
    if (currentTabIdx < TABS.length - 1) setActiveTab(TABS[currentTabIdx + 1]);
  }, [currentTabIdx]);

  const goPrev = useCallback(() => {
    if (currentTabIdx > 0) setActiveTab(TABS[currentTabIdx - 1]);
  }, [currentTabIdx]);

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="bg-[#0B1220] text-white print:bg-white print:text-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-xl">BulletEV Estimate Generator</h1>
            <p className="text-xs text-blue-300 print:text-gray-500">Prototype v0.1.0</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
            {MAP_WORKSPACE_ENABLED && (
              <Link
                href="/estimate/map"
                className="hidden rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 print:hidden sm:inline-block"
              >
                Map Workspace
              </Link>
            )}
            {MAP_WORKSPACE_ENABLED && (
              <Link
                href="/estimate/map"
                className="rounded-md bg-blue-600 p-2 text-white transition hover:bg-blue-500 print:hidden sm:hidden"
                title="Map Workspace"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </Link>
            )}
            <ViewModeToggle />
            <Link href="/" className="text-sm text-blue-300 hover:text-white print:hidden">Home</Link>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b border-gray-200 bg-white print:hidden">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 sm:py-3">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden text-sm font-medium text-gray-700 sm:inline">Estimate Progress</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                progress >= 80 ? 'bg-green-100 text-green-800' :
                progress >= 40 ? 'bg-amber-100 text-amber-800' :
                'bg-gray-100 text-gray-600'
              }`}>{progress}%</span>
            </div>
            <span className="text-xs text-gray-500">
              <span className="hidden sm:inline">Step </span>{currentTabIdx + 1}/{TABS.length}<span className="hidden sm:inline">: {activeTab}</span>
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
                  className={`h-2 flex-1 rounded-full transition-all ${
                    isCurrent
                      ? 'bg-[#2563EB] ring-2 ring-blue-300 ring-offset-1'
                      : status === 'complete'
                        ? 'bg-green-400 hover:bg-green-500'
                        : status === 'partial'
                          ? 'bg-amber-300 hover:bg-amber-400'
                          : i <= currentTabIdx
                            ? 'bg-gray-300 hover:bg-gray-400'
                            : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 print:px-0">
        {/* Onboarding Wizard */}
        {showOnboarding && isEstimateEmpty && (
          <OnboardingWizard onEntrySelect={handleEntrySelect} />
        )}

        {/* AI Status Banner */}
        {isAdvanced && aiStatus && (!aiStatus.openai || !aiStatus.gemini) && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 print:hidden">
            <strong>AI features partially available:</strong>{' '}
            {!aiStatus.openai && !aiStatus.gemini
              ? 'No AI API keys configured. SOW Parser, Chat Builder, AI Reviewer, and Photo Analysis require OPENAI_API_KEY and GEMINI_API_KEY.'
              : !aiStatus.openai
                ? 'OPENAI_API_KEY not set — SOW Parser, Chat Builder, and AI Reviewer unavailable.'
                : 'GEMINI_API_KEY not set — Photo Analysis unavailable.'}
          </div>
        )}

        {/* Scenario Loader */}
        <div className={`mb-6 flex flex-wrap items-center gap-4 print:hidden ${showOnboarding && isEstimateEmpty ? 'hidden' : ''}`}>
          <label className="text-sm font-medium text-gray-700">Quick Start:</label>
          <select
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            defaultValue=""
            onChange={(e) => { if (e.target.value) loadScenario(e.target.value); }}
          >
            <option value="">Load a sample scenario...</option>
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={() => { resetEstimate(); setOutput(null); }}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Clear All
          </button>
          <span className="text-xs text-gray-400">or fill out the form below step by step</span>
        </div>

        {/* Advanced: SOW Parser + Photo Analysis */}
        {isAdvanced && !(showOnboarding && isEstimateEmpty) && (
          <div className="mb-6 grid gap-4 md:grid-cols-2 print:hidden">
            <SOWParser onApplyFields={applyFlatFields} />
            <PhotoAnalysis onApplyFields={applyFlatFields} />
          </div>
        )}

        {/* Advanced: Input Mode Toggle */}
        {isAdvanced && !(showOnboarding && isEstimateEmpty) && (
          <div className="mb-4 flex gap-2 print:hidden">
            <button
              onClick={() => setInputMode('form')}
              className={`rounded px-4 py-2 text-sm font-medium transition ${
                inputMode === 'form'
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Form Input
            </button>
            <button
              onClick={() => setInputMode('chat')}
              className={`rounded px-4 py-2 text-sm font-medium transition ${
                inputMode === 'chat'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Chat Builder
            </button>
          </div>
        )}

        {/* Chat Builder (Advanced, chat mode) */}
        {isAdvanced && inputMode === 'chat' && !(showOnboarding && isEstimateEmpty) && (
          <div className="mb-8 print:hidden">
            <ChatBuilder
              currentInput={input}
              onApplyFields={applyFlatFields}
              onGenerateEstimate={handleGenerate}
            />
          </div>
        )}

        {/* Form (Classic or Advanced form mode) */}
        <div className={`mb-8 rounded-lg border border-gray-200 bg-white shadow-sm print:hidden ${(isAdvanced && inputMode === 'chat') || (showOnboarding && isEstimateEmpty) ? 'hidden' : ''}`}>
          {/* Tab Bar — horizontal scroll on mobile */}
          <div className="flex gap-0 overflow-x-auto border-b border-gray-200 bg-gray-50 scrollbar-none">
            {TABS.map((tab) => {
              const status = tabStatuses[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative flex flex-shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                    activeTab === tab
                      ? 'border-b-2 border-[#2563EB] bg-white text-[#2563EB]'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {status === 'complete' && (
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">&#10003;</span>
                  )}
                  {status === 'partial' && (
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                  )}
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Section Header */}
          <div className="border-b border-gray-100 bg-blue-50/50 px-4 py-2 sm:px-6 sm:py-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">{activeTab}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{TAB_META[activeTab]?.description}</p>
              </div>
              {TAB_META[activeTab]?.required.length > 0 && (
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  {TAB_META[activeTab].required.filter(f => isFieldFilled(getFieldValue(input, f))).length}/{TAB_META[activeTab].required.length} required filled
                </span>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            <ErrorBoundary fallbackLabel={activeTab}>
              <SectionRenderer tab={activeTab} />
            </ErrorBoundary>
          </div>

          {/* Navigation Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <button
                onClick={goPrev}
                disabled={currentTabIdx === 0}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                &#8592; Previous
              </button>
              <button
                onClick={goNext}
                disabled={currentTabIdx === TABS.length - 1}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next &#8594;
              </button>
            </div>
            <div className="flex w-full items-center gap-3 sm:w-auto">
              {progress < 40 && (
                <span className="hidden text-xs text-gray-400 sm:inline">Fill in key fields to improve estimate accuracy</span>
              )}
              {progress >= 40 && progress < 80 && (
                <span className="hidden text-xs text-amber-600 sm:inline">Good progress — more detail = better estimate</span>
              )}
              {progress >= 80 && (
                <span className="hidden text-xs text-green-600 sm:inline">Ready to generate a high-confidence estimate</span>
              )}
              <button
                onClick={handleGenerate}
                className={`w-full rounded-lg px-8 py-2.5 text-sm font-semibold text-white transition sm:w-auto ${
                  progress >= 40
                    ? 'bg-[#2563EB] hover:bg-blue-700'
                    : 'bg-gray-400 hover:bg-gray-500'
                }`}
              >
                Generate Estimate
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {output && (
          <>
            <EstimateResults output={output} expandedLines={expandedLines} toggleLine={toggleLine} />

            {/* Advanced: AI Reviewer */}
            {isAdvanced && (
              <div className="mt-6 print:hidden">
                <AIReviewer
                  input={input}
                  output={output}
                  onApplyChange={(field, value) => updateField(field, value)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Live Estimate Summary — sticky bottom bar */}
      <LiveEstimateSummary autoEstimate={autoEstimate} />
    </main>
  );
}

// ============================================================
// Estimate Results
// ============================================================

function EstimateResults({
  output, expandedLines, toggleLine,
}: {
  output: EstimateOutput;
  expandedLines: Set<string>;
  toggleLine: (id: string) => void;
}) {
  const { summary, metadata, lineItems, exclusions, manualReviewTriggers } = output;

  const byCategory = lineItems.reduce<Record<string, EstimateLineItem[]>>((acc, li) => ({
    ...acc,
    [li.category]: [...(acc[li.category] ?? []), li],
  }), {});

  return (
    <div id="estimate-output" className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 sm:text-2xl">{output.input.project.name || 'Untitled Project'}</h2>
          <p className="mt-1 truncate text-sm text-gray-500">{output.input.customer.companyName} | {output.input.site.address}</p>
          <p className="mt-1 text-xs text-gray-400">Generated {new Date(metadata.generatedAt).toLocaleString()} | Engine {metadata.engineVersion}</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          <div className="rounded-lg bg-gray-50 px-3 py-2 sm:px-4">
            <p className="text-[10px] text-gray-500 sm:text-xs">Completeness</p>
            <p className={`text-base font-bold sm:text-lg ${metadata.inputCompleteness >= 70 ? 'text-green-600' : metadata.inputCompleteness >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
              {metadata.inputCompleteness}%
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 sm:px-4">
            <p className="text-[10px] text-gray-500 sm:text-xs">Confidence</p>
            <p className={`text-base font-bold sm:text-lg ${metadata.automationConfidence === 'high' ? 'text-green-600' : metadata.automationConfidence === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
              {metadata.automationConfidence.toUpperCase()}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 sm:px-4">
            <p className="text-[10px] text-gray-500 sm:text-xs">Total</p>
            <p className="text-base font-bold text-gray-900 sm:text-lg">{fmt(summary.total)}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 print:hidden sm:flex-row sm:gap-3">
          <button
            onClick={() => exportEstimatePDF(output)}
            className="w-full rounded-lg bg-[#0B1220] px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 sm:w-auto"
          >
            Download PDF
          </button>
          {MAP_WORKSPACE_ENABLED && (
            <Link
              href="/estimate/map"
              className="w-full rounded-lg bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
            >
              Open Map Workspace
            </Link>
          )}
        </div>
      </div>

      {/* Manual Review Triggers */}
      {manualReviewTriggers.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 print:border-gray-300 print:bg-gray-50 sm:p-6">
          <h3 className="text-base font-semibold text-amber-900 sm:text-lg">Manual Review Required ({manualReviewTriggers.length})</h3>
          <div className="mt-3 space-y-2">
            {manualReviewTriggers.map((trigger: ManualReviewTrigger) => (
              <div key={trigger.id} className="flex items-start gap-2 rounded border border-amber-200 bg-white px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
                <SeverityBadge severity={trigger.severity} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{trigger.message}</p>
                  <p className="text-xs text-gray-500">Field: {trigger.field} | Condition: {trigger.condition}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
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
            <div key={item.label} className="flex justify-between rounded bg-gray-50 px-4 py-2">
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className="text-sm font-medium text-gray-900">{fmt(item.value)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-gray-200 pt-4 space-y-1">
          <div className="flex justify-between gap-2"><span className="text-xs text-gray-600 sm:text-sm">Subtotal ({output.input.estimateControls.markupPercent}% markup)</span><span className="flex-shrink-0 text-xs font-medium sm:text-sm">{fmt(summary.subtotal)}</span></div>
          <div className="flex justify-between gap-2"><span className="text-xs text-gray-600 sm:text-sm">Tax ({output.input.estimateControls.taxRate}%)</span><span className="flex-shrink-0 text-xs font-medium sm:text-sm">{fmt(summary.tax)}</span></div>
          <div className="flex justify-between gap-2"><span className="text-xs text-gray-600 sm:text-sm">Contingency ({output.input.estimateControls.contingencyPercent}%)</span><span className="flex-shrink-0 text-xs font-medium sm:text-sm">{fmt(summary.contingency)}</span></div>
          <div className="flex justify-between gap-2 border-t border-gray-300 pt-2"><span className="text-sm font-semibold text-gray-900 sm:text-base">Total</span><span className="flex-shrink-0 text-sm font-bold text-gray-900 sm:text-base">{fmt(summary.total)}</span></div>
        </div>
      </div>

      {/* Line Items by Category */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Line Items ({lineItems.length})</h3>
        </div>
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[600px] text-sm sm:min-w-0">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="hidden px-4 py-3 sm:table-cell">ID</th>
                <th className="hidden px-4 py-3 sm:table-cell">Category</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3">Description</th>
                <th className="px-3 py-2 text-right sm:px-4 sm:py-3">Qty</th>
                <th className="hidden px-4 py-3 sm:table-cell">Unit</th>
                <th className="hidden px-4 py-3 text-right lg:table-cell">Unit Price</th>
                <th className="px-3 py-2 text-right sm:px-4 sm:py-3">Ext. Price</th>
                <th className="hidden px-4 py-3 md:table-cell">Source</th>
                <th className="hidden px-4 py-3 text-center md:table-cell">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byCategory).map(([cat, items]) => (
                <CategoryGroup
                  key={cat}
                  category={cat}
                  items={items}
                  expandedLines={expandedLines}
                  toggleLine={toggleLine}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exclusions */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Exclusions ({exclusions.length})</h3>
        <ul className="mt-3 space-y-2">
          {exclusions.map((ex) => (
            <li key={ex.id} className="flex items-start gap-2 text-xs sm:text-sm">
              <span className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{ex.category}</span>
              <span className="text-gray-700">{ex.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// Category Group (line items grouped)
// ============================================================

function CategoryGroup({
  category, items, expandedLines, toggleLine,
}: {
  category: string;
  items: EstimateLineItem[];
  expandedLines: Set<string>;
  toggleLine: (id: string) => void;
}) {
  const catTotal = items.reduce((s, li) => s + li.extendedPrice, 0);

  return (
    <>
      <tr className="bg-gray-100">
        <td colSpan={9} className="px-3 py-2 sm:px-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-600">{category}</span>
            <span className="text-xs font-bold text-gray-600">{fmt(catTotal)}</span>
          </div>
        </td>
      </tr>
      {items.map((li, idx) => (
        <LineItemRow
          key={li.id}
          item={li}
          isOdd={idx % 2 === 1}
          expanded={expandedLines.has(li.id)}
          onToggle={() => toggleLine(li.id)}
        />
      ))}
    </>
  );
}

// ============================================================
// Line Item Row
// ============================================================

function LineItemRow({
  item, isOdd, expanded, onToggle,
}: {
  item: EstimateLineItem;
  isOdd: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`${isOdd ? 'bg-gray-50' : 'bg-white'} ${item.manualReviewRequired ? 'border-l-4 border-l-amber-400' : ''} cursor-pointer hover:bg-blue-50`}
        onClick={onToggle}
      >
        <td className="hidden px-4 py-2 text-xs text-gray-400 sm:table-cell">{item.id}</td>
        <td className="hidden px-4 py-2 text-xs text-gray-500 sm:table-cell">{item.category}</td>
        <td className="px-3 py-2 text-gray-900 sm:px-4">
          {item.description}
          {item.manualReviewRequired && (
            <span className="ml-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 sm:ml-2 sm:text-xs">REVIEW</span>
          )}
        </td>
        <td className="px-3 py-2 text-right sm:px-4">{item.quantity}</td>
        <td className="hidden px-4 py-2 text-xs text-gray-500 sm:table-cell">{item.unit}</td>
        <td className="hidden px-4 py-2 text-right lg:table-cell">{fmt(item.unitPrice)}</td>
        <td className="px-3 py-2 text-right font-medium sm:px-4">{fmt(item.extendedPrice)}</td>
        <td className="hidden px-4 py-2 md:table-cell"><PricingBadge source={item.pricingSource} /></td>
        <td className="hidden px-4 py-2 text-center md:table-cell"><ConfidenceDot level={item.confidence} /></td>
      </tr>
      {expanded && (
        <tr className="bg-blue-50">
          <td colSpan={9} className="px-3 py-3 sm:px-6 sm:py-4">
            <div className="space-y-1.5 text-xs sm:space-y-2 sm:text-sm">
              <p><span className="font-medium text-gray-700">Rule:</span> <span className="font-mono text-xs text-gray-500">{item.ruleName}</span></p>
              <p><span className="font-medium text-gray-700">Why this line?</span> {item.ruleReason}</p>
              <p><span className="font-medium text-gray-700">Source Inputs:</span> {item.sourceInputs.join(', ')}</p>
              {item.manualReviewReason && (
                <p className="text-amber-700"><span className="font-medium">Review Reason:</span> {item.manualReviewReason}</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

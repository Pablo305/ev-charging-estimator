'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Check,
  FileText,
  Layers3,
  MapPinned,
  Sparkles,
} from 'lucide-react';
import {
  EstimateInput,
  EstimateLineItem,
  EstimateOutput,
  ManualReviewTrigger,
  SiteMapPlan,
} from '@/lib/estimate/types';
import { generateEstimate } from '@/lib/estimate/engine';
import { SCENARIOS } from '@/lib/estimate/scenarios';
import {
  applyMapPlanToInput,
  clearMapAppliedField,
  createEmptySiteMapPlan,
} from '@/lib/estimate/map-plan';

const SitePlanner = dynamic(
  () =>
    import('@/components/estimate/site-planner').then((module) => ({
      default: module.SitePlanner,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[520px] items-center justify-center rounded-[28px] border border-white/15 bg-white/70 text-sm text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        Loading interactive map planner...
      </div>
    ),
  },
);

type TabName =
  | 'Map & Layout'
  | 'Project'
  | 'Customer'
  | 'Site'
  | 'Parking & Civil'
  | 'Charger'
  | 'Electrical'
  | 'Permits & Network'
  | 'Accessories & Scope'
  | 'Pricing & Notes';

const TABS: Array<{
  name: TabName;
  title: string;
  description: string;
}> = [
  {
    name: 'Map & Layout',
    title: 'Map & Layout',
    description: 'Start visually or add the map later in the flow.',
  },
  {
    name: 'Project',
    title: 'Project',
    description: 'Define the job type, owner, and timing.',
  },
  {
    name: 'Customer',
    title: 'Customer',
    description: 'Capture the client contact and billing context.',
  },
  {
    name: 'Site',
    title: 'Site',
    description: 'Anchor the address and high-level location details.',
  },
  {
    name: 'Parking & Civil',
    title: 'Parking & Civil',
    description: 'Describe the parking environment and construction needs.',
  },
  {
    name: 'Charger',
    title: 'Charger',
    description: 'Set hardware, quantities, ports, and mount strategy.',
  },
  {
    name: 'Electrical',
    title: 'Electrical',
    description: 'Capture service, panel, utility, and room details.',
  },
  {
    name: 'Permits & Network',
    title: 'Permits & Network',
    description: 'Cover permits, engineering, and charger connectivity.',
  },
  {
    name: 'Accessories & Scope',
    title: 'Accessories & Scope',
    description: 'Set bollards, signage, pads, and responsibility split.',
  },
  {
    name: 'Pricing & Notes',
    title: 'Pricing & Notes',
    description: 'Tune pricing controls and add final context.',
  },
];

function emptyInput(): EstimateInput {
  return {
    project: {
      name: '',
      salesRep: '',
      projectType: 'full_turnkey',
      timeline: '',
      isNewConstruction: null,
    },
    customer: {
      companyName: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      billingAddress: '',
    },
    site: {
      address: '',
      siteType: null,
      state: '',
      location: null,
      mapPlan: createEmptySiteMapPlan(),
    },
    parkingEnvironment: {
      type: null,
      hasPTSlab: null,
      slabScanRequired: null,
      coringRequired: null,
      surfaceType: null,
      trenchingRequired: null,
      boringRequired: null,
      trafficControlRequired: null,
      indoorOutdoor: null,
      fireRatedPenetrations: null,
      accessRestrictions: '',
    },
    charger: {
      brand: '',
      model: '',
      count: 0,
      pedestalCount: 0,
      portType: null,
      mountType: null,
      isCustomerSupplied: false,
      chargingLevel: null,
      ampsPerCharger: null,
      volts: null,
    },
    electrical: {
      serviceType: null,
      availableCapacityKnown: false,
      availableAmps: null,
      breakerSpaceAvailable: null,
      panelUpgradeRequired: null,
      transformerRequired: null,
      switchgearRequired: null,
      distanceToPanel_ft: null,
      utilityCoordinationRequired: null,
      electricalRoomDescription: '',
    },
    civil: { installationLocationDescription: '' },
    permit: { responsibility: null, feeAllowance: null },
    designEngineering: { responsibility: null, stampedPlansRequired: null },
    network: { type: null, wifiInstallResponsibility: null },
    accessories: {
      bollardQty: 0,
      signQty: 0,
      wheelStopQty: 0,
      stripingRequired: false,
      padRequired: false,
      debrisRemoval: false,
    },
    makeReady: { responsibility: null },
    chargerInstall: { responsibility: null },
    purchasingChargers: { responsibility: null },
    signageBollards: { responsibility: null },
    estimateControls: {
      pricingTier: 'msrp',
      taxRate: 7.0,
      contingencyPercent: 10,
      markupPercent: 20,
    },
    notes: '',
  };
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function setByPath(input: EstimateInput, path: string, value: unknown): void {
  const segments = path.split('.');
  let cursor = input as unknown as Record<string, unknown>;

  for (let index = 0; index < segments.length - 1; index += 1) {
    cursor = cursor[segments[index]] as Record<string, unknown>;
  }

  cursor[segments[segments.length - 1]] = value;
}

function normalizeScenarioInput(input: EstimateInput): EstimateInput {
  return {
    ...structuredClone(input),
    site: {
      ...structuredClone(input.site),
      location: input.site.location ?? null,
      mapPlan: input.site.mapPlan ?? createEmptySiteMapPlan(),
    },
  };
}

function getStateCode(value: string): string {
  if (!value) return '';
  if (value.length <= 2) return value.toUpperCase();

  const stateMap: Record<string, string> = {
    alabama: 'AL',
    alaska: 'AK',
    arizona: 'AZ',
    arkansas: 'AR',
    california: 'CA',
    colorado: 'CO',
    connecticut: 'CT',
    delaware: 'DE',
    florida: 'FL',
    georgia: 'GA',
    illinois: 'IL',
    indiana: 'IN',
    kentucky: 'KY',
    louisiana: 'LA',
    maryland: 'MD',
    massachusetts: 'MA',
    michigan: 'MI',
    mississippi: 'MS',
    missouri: 'MO',
    new_jersey: 'NJ',
    new_york: 'NY',
    north_carolina: 'NC',
    ohio: 'OH',
    pennsylvania: 'PA',
    south_carolina: 'SC',
    tennessee: 'TN',
    texas: 'TX',
    virginia: 'VA',
    washington: 'WA',
  };

  return stateMap[value.toLowerCase().replace(/\s+/g, '_')] ?? '';
}

export default function EstimatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen text-slate-900">
          <div className="page-section mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-6 lg:px-8">
            <div className="glass-panel-strong rounded-[28px] p-8 text-center text-slate-600">
              Loading estimate workspace...
            </div>
          </div>
        </main>
      }
    >
      <EstimatePageClient />
    </Suspense>
  );
}

function EstimatePageClient() {
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get('start') === 'map' ? 'map' : 'form';
  const requestedScenarioId = searchParams.get('scenario');
  const requestedScenario = requestedScenarioId
    ? SCENARIOS.find((scenario) => scenario.id === requestedScenarioId)
    : null;

  const [input, setInput] = useState<EstimateInput>(() =>
    requestedScenario ? normalizeScenarioInput(requestedScenario.input) : emptyInput(),
  );
  const [output, setOutput] = useState<EstimateOutput | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>(() =>
    requestedMode === 'map' ? 'Map & Layout' : 'Project',
  );
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [experienceMode, setExperienceMode] = useState<'map' | 'form'>(
    requestedMode,
  );

  const loadScenario = useCallback((id: string) => {
    const found = SCENARIOS.find((scenario) => scenario.id === id);
    if (!found) return;

    setInput(normalizeScenarioInput(found.input));
    setOutput(null);

    const url = new URL(window.location.href);
    url.searchParams.set('scenario', id);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const updateField = useCallback((path: string, value: unknown) => {
    setInput((previous) => {
      const next = structuredClone(previous);
      setByPath(next, path, value);
      return clearMapAppliedField(next, path);
    });
  }, []);

  const handleMapPlanChange = useCallback((plan: SiteMapPlan) => {
    setInput((previous) => applyMapPlanToInput(previous, plan));
  }, []);

  const handleAddressResolved = useCallback(
    ({
      address,
      location,
      state,
    }: {
      address: string;
      location: { lat: number; lng: number };
      state: string;
    }) => {
      setInput((previous) => {
        const next = structuredClone(previous);
        next.site.address = address;
        next.site.location = location;
        if (state) {
          const stateCode = getStateCode(state);
          next.site.state = stateCode || next.site.state;
        }
        return next;
      });
    },
    [],
  );

  const handleGenerate = useCallback(() => {
    setOutput(generateEstimate(input));
  }, [input]);

  const toggleLine = useCallback((id: string) => {
    setExpandedLines((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const mapPlan = input.site.mapPlan ?? createEmptySiteMapPlan();
  const mapAppliedFields = Object.entries(mapPlan.appliedFields ?? {});
  const nextTab = useMemo(() => {
    const currentIndex = TABS.findIndex((tab) => tab.name === activeTab);
    return TABS[currentIndex + 1]?.name ?? null;
  }, [activeTab]);

  return (
    <main className="min-h-screen text-slate-900">
      <div className="page-section mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="glass-panel-dark hero-glow liquid-ring rounded-[32px] px-6 py-6 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="section-eyebrow text-cyan-100/80">
                <MapPinned className="h-4 w-4" />
                Guided Estimate Workflow
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Move from map layout to quote output without losing the form
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200/88">
                Start from a live map or use the guided form. Either way, the
                estimator now keeps site planning, construction features, and
                quote logic connected in one clearer workflow.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Mode', experienceMode === 'map' ? 'Map-first' : 'Form-first'],
                ['Map features', String(mapPlan.features.length)],
                ['Quote fields posted', String(mapAppliedFields.length)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[24px] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-xl"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                    {label}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] print:block">
          <section className="space-y-5 print:hidden">
            <div className="glass-panel-strong rounded-[28px] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="section-eyebrow">Workflow Sections</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    Pick a section and keep the map in the loop
                  </h2>
                </div>
                {nextTab && (
                  <button
                    type="button"
                    onClick={() => setActiveTab(nextTab)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Next Section
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {TABS.map((tab, index) => (
                  <button
                    key={tab.name}
                    type="button"
                    onClick={() => setActiveTab(tab.name)}
                    className={`rounded-[24px] border px-4 py-4 text-left transition ${
                      activeTab === tab.name
                        ? 'border-slate-900 bg-slate-900 text-white shadow-[0_16px_30px_rgba(15,23,42,0.22)]'
                        : 'border-slate-200 bg-white/85 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                          activeTab === tab.name ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        0{index + 1}
                      </span>
                      {activeTab === tab.name && (
                        <Check className="h-4 w-4 text-cyan-300" />
                      )}
                    </div>
                    <p className="mt-3 text-sm font-semibold">{tab.title}</p>
                    <p
                      className={`mt-2 text-xs leading-5 ${
                        activeTab === tab.name ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {tab.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel-strong rounded-[28px] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <p className="section-eyebrow">
                    <Layers3 className="h-4 w-4" />
                    Active Section
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    {activeTab}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {TABS.find((tab) => tab.name === activeTab)?.description}
                  </p>
                </div>
                {activeTab !== 'Map & Layout' && mapAppliedFields.length > 0 && (
                  <div className="rounded-[22px] border border-cyan-200 bg-cyan-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                      Map Sync Active
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {mapAppliedFields.length} estimate fields are currently being
                      driven by the map.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-5">
                <TabContent
                  tab={activeTab}
                  input={input}
                  updateField={updateField}
                  onMapPlanChange={handleMapPlanChange}
                  onAddressResolved={handleAddressResolved}
                />
              </div>
            </div>
          </section>

          <aside className="space-y-5 print:hidden">
            <div className="glass-panel rounded-[28px] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:sticky lg:top-6">
              <p className="section-eyebrow">
                <Sparkles className="h-4 w-4" />
                Guided Actions
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Stay oriented while you build the estimate
              </h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Load Sample Scenario
                  </label>
                  <select
                    className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none focus:border-slate-400"
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value) loadScenario(event.target.value);
                    }}
                  >
                    <option value="">Select scenario</option>
                    {SCENARIOS.map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Map Highlights
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {[
                      ['Chargers', mapPlan.summary.chargerCount],
                      ['Bollards', mapPlan.summary.bollardCount],
                      ['Pads', mapPlan.summary.padCount],
                      ['Trench ft', mapPlan.summary.trenchLengthFt],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl bg-slate-50 px-4 py-3"
                      >
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          {label}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Quote Posting
                  </p>
                  <div className="mt-3 space-y-2">
                    {mapAppliedFields.length === 0 ? (
                      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        Add map features to automatically populate estimate
                        fields and highlight affected line items.
                      </p>
                    ) : (
                      mapAppliedFields.map(([path, field]) => (
                        <div
                          key={path}
                          className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                            {path}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {String(field.value)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Quote Controls
                  </p>
                  <div className="mt-4 space-y-3">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:shadow-lg"
                    >
                      Generate Estimate
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInput(emptyInput());
                        setOutput(null);
                        setActiveTab('Project');
                        setExperienceMode('form');
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                    >
                      Reset Draft
                    </button>
                    <Link
                      href="/"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Back Home
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {output && (
          <div className="mt-8">
            <EstimateResults
              output={output}
              expandedLines={expandedLines}
              toggleLine={toggleLine}
            />
          </div>
        )}
      </div>
    </main>
  );
}

function TabContent({
  tab,
  input,
  updateField,
  onMapPlanChange,
  onAddressResolved,
}: {
  tab: TabName;
  input: EstimateInput;
  updateField: (path: string, value: unknown) => void;
  onMapPlanChange: (plan: SiteMapPlan) => void;
  onAddressResolved: (result: {
    address: string;
    location: { lat: number; lng: number };
    state: string;
  }) => void;
}) {
  const inputCls =
    'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none focus:border-slate-400';
  const textareaCls =
    'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400';
  const labelCls =
    'mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500';
  const gridCls = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';
  const accessoryToggles: Array<{
    label: string;
    path:
      | 'accessories.stripingRequired'
      | 'accessories.padRequired'
      | 'accessories.debrisRemoval';
    value: boolean;
  }> = [
    {
      label: 'Striping Required',
      path: 'accessories.stripingRequired',
      value: input.accessories.stripingRequired,
    },
    {
      label: 'Concrete Pad Required',
      path: 'accessories.padRequired',
      value: input.accessories.padRequired,
    },
    {
      label: 'Debris Removal',
      path: 'accessories.debrisRemoval',
      value: input.accessories.debrisRemoval,
    },
  ];

  switch (tab) {
    case 'Map & Layout':
      return (
        <div className="space-y-5">
          <div className="rounded-[24px] border border-cyan-200 bg-cyan-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-600 text-white">
                <MapPinned className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Add chargers, panels, bollards, pads, trench runs, conduit
                  paths, mechanical rooms, and restricted zones directly on the
                  site.
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  As you draw, the planner updates quote-driving fields like
                  charger count, bollard quantity, pad requirement, trenching,
                  and distance-to-panel automatically.
                </p>
              </div>
            </div>
          </div>

          <SitePlanner
            address={input.site.address}
            value={input.site.mapPlan}
            onChange={onMapPlanChange}
            onAddressResolved={onAddressResolved}
          />
        </div>
      );

    case 'Project':
      return (
        <div className={gridCls}>
          <div>
            <label className={labelCls}>Project Name</label>
            <input
              className={inputCls}
              value={input.project.name}
              onChange={(event) => updateField('project.name', event.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Sales Rep</label>
            <input
              className={inputCls}
              value={input.project.salesRep}
              onChange={(event) =>
                updateField('project.salesRep', event.target.value)
              }
            />
          </div>
          <div>
            <label className={labelCls}>Project Type</label>
            <select
              className={inputCls}
              value={input.project.projectType}
              onChange={(event) =>
                updateField('project.projectType', event.target.value)
              }
            >
              {[
                'full_turnkey',
                'full_turnkey_connectivity',
                'equipment_install_commission',
                'install_commission',
                'equipment_purchase',
                'remove_replace',
                'commission_only',
                'service_work',
                'supercharger',
              ].map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Timeline</label>
            <input
              className={inputCls}
              value={input.project.timeline}
              onChange={(event) =>
                updateField('project.timeline', event.target.value)
              }
            />
          </div>
          <div>
            <label className={labelCls}>New Construction?</label>
            <select
              className={inputCls}
              value={
                input.project.isNewConstruction === null
                  ? 'null'
                  : String(input.project.isNewConstruction)
              }
              onChange={(event) =>
                updateField(
                  'project.isNewConstruction',
                  event.target.value === 'null'
                    ? null
                    : event.target.value === 'true',
                )
              }
            >
              <option value="null">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      );

    case 'Customer':
      return (
        <div className={gridCls}>
          <div>
            <label className={labelCls}>Company Name</label>
            <input
              className={inputCls}
              value={input.customer.companyName}
              onChange={(event) =>
                updateField('customer.companyName', event.target.value)
              }
            />
          </div>
          <div>
            <label className={labelCls}>Contact Name</label>
            <input
              className={inputCls}
              value={input.customer.contactName}
              onChange={(event) =>
                updateField('customer.contactName', event.target.value)
              }
            />
          </div>
          <div>
            <label className={labelCls}>Contact Email</label>
            <input
              type="email"
              className={inputCls}
              value={input.customer.contactEmail}
              onChange={(event) =>
                updateField('customer.contactEmail', event.target.value)
              }
            />
          </div>
          <div>
            <label className={labelCls}>Contact Phone</label>
            <input
              className={inputCls}
              value={input.customer.contactPhone}
              onChange={(event) =>
                updateField('customer.contactPhone', event.target.value)
              }
            />
          </div>
          <div className="sm:col-span-2 xl:col-span-3">
            <label className={labelCls}>Billing Address</label>
            <input
              className={inputCls}
              value={input.customer.billingAddress}
              onChange={(event) =>
                updateField('customer.billingAddress', event.target.value)
              }
            />
          </div>
        </div>
      );

    case 'Site':
      return (
        <div className={gridCls}>
          <div className="sm:col-span-2 xl:col-span-3">
            <label className={labelCls}>Site Address</label>
            <input
              className={inputCls}
              value={input.site.address}
              onChange={(event) => updateField('site.address', event.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Site Type</label>
            <select
              className={inputCls}
              value={input.site.siteType ?? ''}
              onChange={(event) =>
                updateField('site.siteType', event.target.value || null)
              }
            >
              <option value="">Select site type</option>
              {[
                'airport',
                'apartment',
                'event_venue',
                'fleet_dealer',
                'hospital',
                'hotel',
                'industrial',
                'mixed_use',
                'fuel_station',
                'municipal',
                'office',
                'parking_structure',
                'police_gov',
                'recreational',
                'campground',
                'restaurant',
                'retail',
                'school',
                'other',
              ].map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>State</label>
            <input
              className={inputCls}
              value={input.site.state}
              onChange={(event) => updateField('site.state', event.target.value)}
            />
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 sm:col-span-2 xl:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Map Location
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {input.site.location
                ? `${input.site.location.lat.toFixed(5)}, ${input.site.location.lng.toFixed(5)}`
                : 'No geocoded map location yet. Use the Map & Layout step to locate the site.'}
            </p>
          </div>
        </div>
      );

    case 'Parking & Civil':
      return (
        <div className="space-y-5">
          <div className={gridCls}>
            <div>
              <label className={labelCls}>Parking Type</label>
              <select
                className={inputCls}
                value={input.parkingEnvironment.type ?? ''}
                onChange={(event) =>
                  updateField('parkingEnvironment.type', event.target.value || null)
                }
              >
                <option value="">Unknown</option>
                <option value="surface_lot">Surface Lot</option>
                <option value="parking_garage">Parking Garage</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Surface Type</label>
              <select
                className={inputCls}
                value={input.parkingEnvironment.surfaceType ?? ''}
                onChange={(event) =>
                  updateField(
                    'parkingEnvironment.surfaceType',
                    event.target.value || null,
                  )
                }
              >
                <option value="">Unknown</option>
                <option value="asphalt">Asphalt</option>
                <option value="concrete">Concrete</option>
                <option value="gravel">Gravel</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Indoor / Outdoor</label>
              <select
                className={inputCls}
                value={input.parkingEnvironment.indoorOutdoor ?? ''}
                onChange={(event) =>
                  updateField(
                    'parkingEnvironment.indoorOutdoor',
                    event.target.value || null,
                  )
                }
              >
                <option value="">Unknown</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="both">Both</option>
              </select>
            </div>
            <BoolField
              label="Has PT Slab?"
              path="parkingEnvironment.hasPTSlab"
              value={input.parkingEnvironment.hasPTSlab}
              updateField={updateField}
              cls={inputCls}
              labelCls={labelCls}
            />
            <BoolField
              label="Trenching Required?"
              path="parkingEnvironment.trenchingRequired"
              value={input.parkingEnvironment.trenchingRequired}
              updateField={updateField}
              cls={inputCls}
              labelCls={labelCls}
            />
            <BoolField
              label="Boring Required?"
              path="parkingEnvironment.boringRequired"
              value={input.parkingEnvironment.boringRequired}
              updateField={updateField}
              cls={inputCls}
              labelCls={labelCls}
            />
            <BoolField
              label="Coring Required?"
              path="parkingEnvironment.coringRequired"
              value={input.parkingEnvironment.coringRequired}
              updateField={updateField}
              cls={inputCls}
              labelCls={labelCls}
            />
            <BoolField
              label="Traffic Control?"
              path="parkingEnvironment.trafficControlRequired"
              value={input.parkingEnvironment.trafficControlRequired}
              updateField={updateField}
              cls={inputCls}
              labelCls={labelCls}
            />
            <BoolField
              label="Fire-Rated Penetrations?"
              path="parkingEnvironment.fireRatedPenetrations"
              value={input.parkingEnvironment.fireRatedPenetrations}
              updateField={updateField}
              cls={inputCls}
              labelCls={labelCls}
            />
            <div className="sm:col-span-2 xl:col-span-3">
              <label className={labelCls}>Access Restrictions</label>
              <input
                className={inputCls}
                value={input.parkingEnvironment.accessRestrictions}
                onChange={(event) =>
                  updateField(
                    'parkingEnvironment.accessRestrictions',
                    event.target.value,
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <label className={labelCls}>Installation Location Description</label>
            <textarea
              className={`${textareaCls} h-32`}
              value={input.civil.installationLocationDescription}
              onChange={(event) =>
                updateField(
                  'civil.installationLocationDescription',
                  event.target.value,
                )
              }
            />
          </div>
        </div>
      );

    case 'Charger':
      return (
        <div className={gridCls}>
          <div>
            <label className={labelCls}>Brand</label>
            <input
              className={inputCls}
              value={input.charger.brand}
              onChange={(event) => updateField('charger.brand', event.target.value)}
              placeholder="Tesla, ChargePoint, Xeal..."
            />
          </div>
          <div>
            <label className={labelCls}>Model</label>
            <input
              className={inputCls}
              value={input.charger.model}
              onChange={(event) => updateField('charger.model', event.target.value)}
              placeholder="Universal Wall Connector, CT4000..."
            />
          </div>
          <div>
            <label className={labelCls}>Count</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={input.charger.count}
              onChange={(event) =>
                updateField('charger.count', parseInt(event.target.value, 10) || 0)
              }
            />
          </div>
          <div>
            <label className={labelCls}>Pedestal Count</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={input.charger.pedestalCount}
              onChange={(event) =>
                updateField(
                  'charger.pedestalCount',
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div>
            <label className={labelCls}>Charging Level</label>
            <select
              className={inputCls}
              value={input.charger.chargingLevel ?? ''}
              onChange={(event) =>
                updateField('charger.chargingLevel', event.target.value || null)
              }
            >
              <option value="">Select</option>
              <option value="l2">Level 2</option>
              <option value="l3_dcfc">Level 3 / DCFC</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Mount Type</label>
            <select
              className={inputCls}
              value={input.charger.mountType ?? ''}
              onChange={(event) =>
                updateField('charger.mountType', event.target.value || null)
              }
            >
              <option value="">Select</option>
              <option value="pedestal">Pedestal</option>
              <option value="wall">Wall</option>
              <option value="mix">Mix</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Port Type</label>
            <select
              className={inputCls}
              value={input.charger.portType ?? ''}
              onChange={(event) =>
                updateField('charger.portType', event.target.value || null)
              }
            >
              <option value="">Select</option>
              <option value="single">Single</option>
              <option value="dual">Dual</option>
              <option value="mix">Mix</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Amps per Charger</label>
            <input
              type="number"
              className={inputCls}
              value={input.charger.ampsPerCharger ?? ''}
              onChange={(event) =>
                updateField(
                  'charger.ampsPerCharger',
                  event.target.value ? parseInt(event.target.value, 10) : null,
                )
              }
            />
          </div>
          <div>
            <label className={labelCls}>Volts</label>
            <input
              type="number"
              className={inputCls}
              value={input.charger.volts ?? ''}
              onChange={(event) =>
                updateField(
                  'charger.volts',
                  event.target.value ? parseInt(event.target.value, 10) : null,
                )
              }
            />
          </div>
          <div>
            <label className={labelCls}>Customer Supplied?</label>
            <select
              className={inputCls}
              value={String(input.charger.isCustomerSupplied)}
              onChange={(event) =>
                updateField(
                  'charger.isCustomerSupplied',
                  event.target.value === 'true',
                )
              }
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
        </div>
      );

    case 'Electrical':
      return (
        <div className={gridCls}>
          <div>
            <label className={labelCls}>Service Type</label>
            <select
              className={inputCls}
              value={input.electrical.serviceType ?? ''}
              onChange={(event) =>
                updateField('electrical.serviceType', event.target.value || null)
              }
            >
              <option value="">Unknown</option>
              <option value="120v">120V</option>
              <option value="208v">208V</option>
              <option value="240v">240V</option>
              <option value="480v_3phase">480V 3-Phase</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Distance to Panel (ft)</label>
            <input
              type="number"
              className={inputCls}
              value={input.electrical.distanceToPanel_ft ?? ''}
              onChange={(event) =>
                updateField(
                  'electrical.distanceToPanel_ft',
                  event.target.value ? parseInt(event.target.value, 10) : null,
                )
              }
            />
          </div>
          <div>
            <label className={labelCls}>Available Amps</label>
            <input
              type="number"
              className={inputCls}
              value={input.electrical.availableAmps ?? ''}
              onChange={(event) =>
                updateField(
                  'electrical.availableAmps',
                  event.target.value ? parseInt(event.target.value, 10) : null,
                )
              }
            />
          </div>
          <div>
            <label className={labelCls}>Capacity Known?</label>
            <select
              className={inputCls}
              value={String(input.electrical.availableCapacityKnown)}
              onChange={(event) =>
                updateField(
                  'electrical.availableCapacityKnown',
                  event.target.value === 'true',
                )
              }
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
          <BoolField
            label="Breaker Space Available?"
            path="electrical.breakerSpaceAvailable"
            value={input.electrical.breakerSpaceAvailable}
            updateField={updateField}
            cls={inputCls}
            labelCls={labelCls}
          />
          <BoolField
            label="Panel Upgrade Required?"
            path="electrical.panelUpgradeRequired"
            value={input.electrical.panelUpgradeRequired}
            updateField={updateField}
            cls={inputCls}
            labelCls={labelCls}
          />
          <BoolField
            label="Transformer Required?"
            path="electrical.transformerRequired"
            value={input.electrical.transformerRequired}
            updateField={updateField}
            cls={inputCls}
            labelCls={labelCls}
          />
          <BoolField
            label="Switchgear Required?"
            path="electrical.switchgearRequired"
            value={input.electrical.switchgearRequired}
            updateField={updateField}
            cls={inputCls}
            labelCls={labelCls}
          />
          <BoolField
            label="Utility Coordination?"
            path="electrical.utilityCoordinationRequired"
            value={input.electrical.utilityCoordinationRequired}
            updateField={updateField}
            cls={inputCls}
            labelCls={labelCls}
          />
          <div className="sm:col-span-2 xl:col-span-3">
            <label className={labelCls}>Electrical Room Description</label>
            <textarea
              className={`${textareaCls} h-28`}
              value={input.electrical.electricalRoomDescription}
              onChange={(event) =>
                updateField(
                  'electrical.electricalRoomDescription',
                  event.target.value,
                )
              }
            />
          </div>
        </div>
      );

    case 'Permits & Network':
      return (
        <div className="space-y-5">
          <div className={gridCls}>
            <div>
              <label className={labelCls}>Permit Responsibility</label>
              <select
                className={inputCls}
                value={input.permit.responsibility ?? ''}
                onChange={(event) =>
                  updateField('permit.responsibility', event.target.value || null)
                }
              >
                <option value="">TBD</option>
                <option value="bullet">Bullet</option>
                <option value="client">Client</option>
                <option value="tbd">TBD</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Permit Fee Allowance ($)</label>
              <input
                type="number"
                className={inputCls}
                value={input.permit.feeAllowance ?? ''}
                onChange={(event) =>
                  updateField(
                    'permit.feeAllowance',
                    event.target.value ? parseFloat(event.target.value) : null,
                  )
                }
              />
            </div>
            <div>
              <label className={labelCls}>Design / Eng Responsibility</label>
              <select
                className={inputCls}
                value={input.designEngineering.responsibility ?? ''}
                onChange={(event) =>
                  updateField(
                    'designEngineering.responsibility',
                    event.target.value || null,
                  )
                }
              >
                <option value="">TBD</option>
                <option value="bullet">Bullet</option>
                <option value="client">Client</option>
                <option value="tbd">TBD</option>
              </select>
            </div>
            <BoolField
              label="Stamped Plans Required?"
              path="designEngineering.stampedPlansRequired"
              value={input.designEngineering.stampedPlansRequired}
              updateField={updateField}
              cls={inputCls}
              labelCls={labelCls}
            />
            <div>
              <label className={labelCls}>Network Type</label>
              <select
                className={inputCls}
                value={input.network.type ?? ''}
                onChange={(event) =>
                  updateField('network.type', event.target.value || null)
                }
              >
                <option value="">Unknown</option>
                <option value="none">None</option>
                <option value="customer_lan">Customer LAN</option>
                <option value="wifi_bridge">WiFi Bridge</option>
                <option value="cellular_router">Cellular Router</option>
                <option value="included_in_package">Included in Package</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>WiFi Install Responsibility</label>
              <select
                className={inputCls}
                value={input.network.wifiInstallResponsibility ?? ''}
                onChange={(event) =>
                  updateField(
                    'network.wifiInstallResponsibility',
                    event.target.value || null,
                  )
                }
              >
                <option value="">N/A</option>
                <option value="bullet">Bullet</option>
                <option value="client">Client</option>
                <option value="na">N/A</option>
                <option value="tbd">TBD</option>
              </select>
            </div>
          </div>
        </div>
      );

    case 'Accessories & Scope':
      return (
        <div className="space-y-5">
          <div className={gridCls}>
            <div>
              <label className={labelCls}>Bollard Qty</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={input.accessories.bollardQty}
                onChange={(event) =>
                  updateField(
                    'accessories.bollardQty',
                    parseInt(event.target.value, 10) || 0,
                  )
                }
              />
            </div>
            <div>
              <label className={labelCls}>Sign Qty</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={input.accessories.signQty}
                onChange={(event) =>
                  updateField(
                    'accessories.signQty',
                    parseInt(event.target.value, 10) || 0,
                  )
                }
              />
            </div>
            <div>
              <label className={labelCls}>Wheel Stop Qty</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={input.accessories.wheelStopQty}
                onChange={(event) =>
                  updateField(
                    'accessories.wheelStopQty',
                    parseInt(event.target.value, 10) || 0,
                  )
                }
              />
            </div>
            {accessoryToggles.map(({ label, path, value }) => (
              <label
                key={path}
                className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(event) => updateField(path, event.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>

          <div className={gridCls}>
            {[
              {
                label: 'Make Ready',
                path: 'makeReady.responsibility',
                value: input.makeReady.responsibility,
              },
              {
                label: 'Charger Install',
                path: 'chargerInstall.responsibility',
                value: input.chargerInstall.responsibility,
              },
              {
                label: 'Purchasing Chargers',
                path: 'purchasingChargers.responsibility',
                value: input.purchasingChargers.responsibility,
              },
            ].map((field) => (
              <div key={field.path}>
                <label className={labelCls}>{field.label}</label>
                <select
                  className={inputCls}
                  value={field.value ?? ''}
                  onChange={(event) =>
                    updateField(field.path, event.target.value || null)
                  }
                >
                  <option value="">TBD</option>
                  <option value="bullet">Bullet</option>
                  <option value="client">Client</option>
                  <option value="tbd">TBD</option>
                </select>
              </div>
            ))}
            <div>
              <label className={labelCls}>Signage / Bollards</label>
              <select
                className={inputCls}
                value={input.signageBollards.responsibility ?? ''}
                onChange={(event) =>
                  updateField(
                    'signageBollards.responsibility',
                    event.target.value || null,
                  )
                }
              >
                <option value="">TBD</option>
                <option value="signage">Signage Only</option>
                <option value="bollards">Bollards Only</option>
                <option value="signage_bollards">Signage + Bollards</option>
                <option value="none">None</option>
                <option value="tbd">TBD</option>
              </select>
            </div>
          </div>
        </div>
      );

    case 'Pricing & Notes':
      return (
        <div className="space-y-5">
          <div className={gridCls}>
            <div>
              <label className={labelCls}>Pricing Tier</label>
              <select
                className={inputCls}
                value={input.estimateControls.pricingTier}
                onChange={(event) =>
                  updateField('estimateControls.pricingTier', event.target.value)
                }
              >
                <option value="bulk_discount">Bulk Discount</option>
                <option value="msrp">MSRP</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                className={inputCls}
                value={input.estimateControls.taxRate}
                onChange={(event) =>
                  updateField(
                    'estimateControls.taxRate',
                    parseFloat(event.target.value) || 0,
                  )
                }
              />
            </div>
            <div>
              <label className={labelCls}>Contingency (%)</label>
              <input
                type="number"
                step="1"
                className={inputCls}
                value={input.estimateControls.contingencyPercent}
                onChange={(event) =>
                  updateField(
                    'estimateControls.contingencyPercent',
                    parseFloat(event.target.value) || 0,
                  )
                }
              />
            </div>
            <div>
              <label className={labelCls}>Markup (%)</label>
              <input
                type="number"
                step="1"
                className={inputCls}
                value={input.estimateControls.markupPercent}
                onChange={(event) =>
                  updateField(
                    'estimateControls.markupPercent',
                    parseFloat(event.target.value) || 0,
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <label className={labelCls}>Notes</label>
            <textarea
              className={`${textareaCls} h-32`}
              value={input.notes}
              onChange={(event) => updateField('notes', event.target.value)}
            />
          </div>
        </div>
      );

    default:
      return null;
  }
}

function BoolField({
  label,
  path,
  value,
  updateField,
  cls,
  labelCls,
}: {
  label: string;
  path: string;
  value: boolean | null;
  updateField: (path: string, value: unknown) => void;
  cls: string;
  labelCls: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select
        className={cls}
        value={value === null ? 'null' : String(value)}
        onChange={(event) =>
          updateField(
            path,
            event.target.value === 'null'
              ? null
              : event.target.value === 'true',
          )
        }
      >
        <option value="null">Unknown</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>
  );
}

function PricingBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    catalog_bulk:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
    catalog_msrp:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
    calculated: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    allowance: 'border-blue-200 bg-blue-50 text-blue-700',
    industry_standard:
      'border-amber-200 bg-amber-50 text-amber-700',
    manual_override:
      'border-violet-200 bg-violet-50 text-violet-700',
    tbd: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${colors[source] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}
    >
      {source.replace(/_/g, ' ')}
    </span>
  );
}

function ConfidenceDot({ level }: { level: string }) {
  const color =
    level === 'high'
      ? 'bg-emerald-500'
      : level === 'medium'
        ? 'bg-amber-500'
        : 'bg-rose-500';

  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
      title={`Confidence: ${level}`}
    />
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const classes =
    severity === 'critical'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : severity === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-cyan-200 bg-cyan-50 text-cyan-700';

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${classes}`}
    >
      {severity}
    </span>
  );
}

function EstimateResults({
  output,
  expandedLines,
  toggleLine,
}: {
  output: EstimateOutput;
  expandedLines: Set<string>;
  toggleLine: (id: string) => void;
}) {
  const { summary, metadata, lineItems, exclusions, manualReviewTriggers } =
    output;

  const grouped = lineItems.reduce<Record<string, EstimateLineItem[]>>(
    (accumulator, lineItem) => {
      if (!accumulator[lineItem.category]) accumulator[lineItem.category] = [];
      accumulator[lineItem.category].push(lineItem);
      return accumulator;
    },
    {},
  );

  return (
    <div id="estimate-output" className="space-y-6">
      <div className="glass-panel-strong rounded-[28px] p-6 text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-eyebrow">
              <FileText className="h-4 w-4" />
              Estimate Output
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              {output.input.project.name || 'Untitled Project'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {output.input.customer.companyName || 'No company name'} |{' '}
              {output.input.site.address || 'No address'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Generated {new Date(metadata.generatedAt).toLocaleString()} | Engine{' '}
              {metadata.engineVersion}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Input completeness', `${metadata.inputCompleteness}%`],
              ['Confidence', metadata.automationConfidence.toUpperCase()],
              ['Map-applied lines', String(metadata.mapAppliedLineItems)],
              ['Total', fmt(summary.total)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[22px] border border-slate-200 bg-white px-4 py-3"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {metadata.mapFeatureCount > 0 && (
        <div className="rounded-[24px] border border-cyan-200 bg-cyan-50 px-5 py-4 text-slate-900">
          <p className="text-sm font-semibold">
            {metadata.mapFeatureCount} mapped feature(s) were included in this
            estimate, and {metadata.mapAppliedLineItems} line item(s) are
            highlighted where map scope posted into the quote.
          </p>
        </div>
      )}

      {manualReviewTriggers.length > 0 && (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 print:border-gray-300 print:bg-gray-50">
          <h3 className="text-lg font-semibold text-amber-900">
            Manual Review Required ({manualReviewTriggers.length})
          </h3>
          <div className="mt-4 space-y-3">
            {manualReviewTriggers.map((trigger: ManualReviewTrigger) => (
              <div
                key={trigger.id}
                className="rounded-[22px] border border-amber-200 bg-white px-4 py-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <SeverityBadge severity={trigger.severity} />
                  <span className="text-xs font-mono text-slate-500">
                    {trigger.id}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">
                  {trigger.message}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Field: {trigger.field} | Condition: {trigger.condition}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-panel rounded-[28px] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
        <h3 className="text-lg font-semibold text-slate-900">Cost Summary</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ['Hardware', summary.hardwareTotal],
            ['Installation', summary.installationTotal],
            ['Permit / Design', summary.permitDesignTotal],
            ['Network', summary.networkTotal],
            ['Accessories', summary.accessoriesTotal],
            ['Service / Software', summary.serviceTotal],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[22px] border border-slate-200 bg-white px-4 py-3"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {fmt(value as number)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-600">
          <div className="flex justify-between">
            <span>
              Subtotal (with {output.input.estimateControls.markupPercent}% markup)
            </span>
            <span className="font-medium text-slate-900">
              {fmt(summary.subtotal)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tax ({output.input.estimateControls.taxRate}%)</span>
            <span className="font-medium text-slate-900">{fmt(summary.tax)}</span>
          </div>
          <div className="flex justify-between">
            <span>
              Contingency ({output.input.estimateControls.contingencyPercent}%)
            </span>
            <span className="font-medium text-slate-900">
              {fmt(summary.contingency)}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>{fmt(summary.total)}</span>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-[28px] shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Line Items ({lineItems.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Ext. Price</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-center">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([category, items]) => (
                <CategoryGroup
                  key={category}
                  category={category}
                  items={items}
                  expandedLines={expandedLines}
                  toggleLine={toggleLine}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel rounded-[28px] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
        <h3 className="text-lg font-semibold text-slate-900">
          Exclusions ({exclusions.length})
        </h3>
        <ul className="mt-4 space-y-3">
          {exclusions.map((exclusion) => (
            <li
              key={exclusion.id}
              className="flex items-start gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm"
            >
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-600">
                {exclusion.category}
              </span>
              <span className="text-slate-700">{exclusion.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CategoryGroup({
  category,
  items,
  expandedLines,
  toggleLine,
}: {
  category: string;
  items: EstimateLineItem[];
  expandedLines: Set<string>;
  toggleLine: (id: string) => void;
}) {
  const categoryTotal = items.reduce((sum, item) => sum + item.extendedPrice, 0);

  return (
    <>
      <tr className="bg-slate-100/80">
        <td
          colSpan={6}
          className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600"
        >
          {category}
        </td>
        <td className="px-4 py-3 text-right text-xs font-semibold text-slate-700">
          {fmt(categoryTotal)}
        </td>
        <td colSpan={2} />
      </tr>
      {items.map((item, index) => (
        <LineItemRow
          key={item.id}
          item={item}
          isOdd={index % 2 === 1}
          expanded={expandedLines.has(item.id)}
          onToggle={() => toggleLine(item.id)}
        />
      ))}
    </>
  );
}

function LineItemRow({
  item,
  isOdd,
  expanded,
  onToggle,
}: {
  item: EstimateLineItem;
  isOdd: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`cursor-pointer transition hover:bg-cyan-50 ${
          isOdd ? 'bg-slate-50/80' : 'bg-white'
        } ${
          item.manualReviewRequired
            ? 'border-l-4 border-l-amber-400'
            : item.derivedFromMap
              ? 'border-l-4 border-l-cyan-400'
              : ''
        }`}
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-xs text-slate-400">{item.id}</td>
        <td className="px-4 py-3 text-xs text-slate-500">{item.category}</td>
        <td className="px-4 py-3 text-slate-900">
          <div className="flex flex-wrap items-center gap-2">
            <span>{item.description}</span>
            {item.manualReviewRequired && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                Review
              </span>
            )}
            {item.derivedFromMap && (
              <span className="rounded-full bg-cyan-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
                Map Applied
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right">{item.quantity}</td>
        <td className="px-4 py-3 text-xs text-slate-500">{item.unit}</td>
        <td className="px-4 py-3 text-right">{fmt(item.unitPrice)}</td>
        <td className="px-4 py-3 text-right font-medium">
          {fmt(item.extendedPrice)}
        </td>
        <td className="px-4 py-3">
          <PricingBadge source={item.pricingSource} />
        </td>
        <td className="px-4 py-3 text-center">
          <ConfidenceDot level={item.confidence} />
        </td>
      </tr>
      {expanded && (
        <tr className="bg-cyan-50/70">
          <td colSpan={9} className="px-6 py-4">
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Rule:</span>{' '}
                <span className="font-mono text-xs text-slate-500">
                  {item.ruleName}
                </span>
              </p>
              <p>
                <span className="font-semibold text-slate-900">Why this line?</span>{' '}
                {item.ruleReason}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Source inputs:</span>{' '}
                {item.sourceInputs.join(', ')}
              </p>
              {item.mapFeatureTypes && item.mapFeatureTypes.length > 0 && (
                <p>
                  <span className="font-semibold text-slate-900">Map feature types:</span>{' '}
                  {item.mapFeatureTypes.join(', ')}
                </p>
              )}
              {item.manualReviewReason && (
                <p className="text-amber-700">
                  <span className="font-semibold">Review reason:</span>{' '}
                  {item.manualReviewReason}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

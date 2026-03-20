import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Cable,
  FileText,
  Layers3,
  MapPinned,
  Route,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

const scenarios = [
  {
    name: 'Hampton Inn Surface Lot',
    desc: '4x Tesla UWC, pedestal mount, surface lot, hotel frontage.',
  },
  {
    name: 'Downtown Apartment Garage',
    desc: '4x Tesla UWC, garage wall mount, PT slab and routing complexity.',
  },
  {
    name: 'Mixed Environment Complex',
    desc: '6x ChargePoint CT4000, garage plus surface, heavy civil coordination.',
  },
  {
    name: 'Tesla Supercharger Station',
    desc: '4-stall DC fast charging package with transformer and trench work.',
  },
];

const featureCards = [
  {
    title: 'Map-driven scope capture',
    text: 'Start from a live map, place chargers and panels, draw trench and conduit runs, and feed real layout intent into the estimate.',
    icon: MapPinned,
  },
  {
    title: 'Construction-aware planning',
    text: 'Add EV construction elements like mechanical rooms, pads, bollards, and restricted zones so site complexity is visible earlier.',
    icon: Building2,
  },
  {
    title: 'Transparent quote logic',
    text: 'Every estimate line shows why it appeared, what data drove it, and where mapped scope posted into the quote.',
    icon: FileText,
  },
];

const workflow = [
  {
    step: '01',
    title: 'Choose your starting point',
    text: 'Start from map for spatial planning or from form for a guided estimator workflow.',
    icon: Layers3,
  },
  {
    step: '02',
    title: 'Lay out site features',
    text: 'Pin chargers, panel locations, bollards, pads, and route trench/conduit paths directly on the site.',
    icon: Route,
  },
  {
    step: '03',
    title: 'Review the quote impact',
    text: 'See map-driven quantities applied to the estimate and highlighted on the affected line items.',
    icon: Sparkles,
  },
];

const statusCards: Array<{
  title: string;
  text: string;
  active: boolean;
}> = [
  {
    title: 'Offline-ready estimator',
    text: 'No external dependency needed for estimate generation',
    active: true,
  },
  {
    title: 'Interactive site planner',
    text: 'Live map with EV construction tools and quote posting',
    active: true,
  },
  {
    title: 'Catalog-backed pricing',
    text: 'Tesla SC, L2, accessories, and installation rules loaded',
    active: true,
  },
  {
    title: 'monday.com live mode',
    text: 'Optional, still disconnected unless env vars are configured',
    active: false,
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-slate-900">
      <div className="page-section mx-auto max-w-7xl px-5 pb-20 pt-6 sm:px-6 lg:px-8">
        <header className="glass-panel-dark liquid-ring hero-glow rounded-[32px] px-6 py-6 text-white sm:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="section-eyebrow text-cyan-100/80">
                <Sparkles className="h-4 w-4" />
                BulletEV Smart Estimate Studio
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                <span className="gradient-text">Map-first EV estimates</span>
                <br />
                with a friendlier, smarter quoting flow
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200/88 sm:text-lg">
                Move from rough site notes to a clearer EV charging estimate by
                combining live map planning, construction-aware project features,
                and transparent line-item pricing in one guided experience.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/estimate?start=map"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:translate-y-[-1px] hover:shadow-xl"
                >
                  Start From Map
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/estimate?start=form"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/14"
                >
                  Start With Guided Form
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/debug"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/30 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-950/45"
                >
                  Inspect Debug View
                </Link>
              </div>
            </div>

            <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
              {[
                { label: 'Map-derived quote fields', value: 'Auto-apply' },
                { label: 'Construction feature tools', value: '9 types' },
                { label: 'Built-in test scenarios', value: '4 ready' },
                { label: 'Estimate traceability', value: 'Line-by-line' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/12 bg-white/10 px-5 py-4 backdrop-blur-xl"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                    {item.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="page-section mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel-strong rounded-[28px] p-6 text-slate-900 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/12 text-cyan-700">
                <MapPinned className="h-5 w-5" />
              </span>
              <div>
                <p className="section-eyebrow">Why This Flow Works</p>
                <h2 className="mt-1 text-2xl font-semibold">
                  The homepage now teaches the product before the user clicks
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {featureCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className="soft-card rounded-[24px] px-5 py-5"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {card.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-[28px] p-6 text-slate-900 sm:p-7">
            <p className="section-eyebrow">System Status</p>
            <h2 className="mt-3 text-2xl font-semibold">
              Guided, transparent, and ready to explore
            </h2>

            <div className="mt-5 space-y-3">
              {statusCards.map(({ title, text, active }) => (
                <div
                  key={title}
                  className={`rounded-[22px] border px-4 py-4 ${
                    active
                      ? 'border-emerald-200 bg-emerald-50/80'
                      : 'border-amber-200 bg-amber-50/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl ${
                        active
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {active ? (
                        <ShieldCheck className="h-4 w-4" />
                      ) : (
                        <Cable className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="page-section mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="glass-panel-strong rounded-[28px] p-6 sm:p-7">
            <p className="section-eyebrow">How It Flows</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">
              A clearer path from site layout to quote output
            </h2>

            <div className="mt-6 space-y-4">
              {workflow.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="soft-card rounded-[24px] px-5 py-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Step {item.step}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-[28px] p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-eyebrow">Built-In Scenarios</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                  Start from realistic EV project examples
                </h2>
              </div>
              <Link
                href="/estimate?start=map"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Open Estimator
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {scenarios.map((scenario, index) => (
                <div
                  key={scenario.name}
                  className="soft-card rounded-[24px] px-5 py-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                      0{index + 1}
                    </span>
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {scenario.name}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {scenario.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="page-section mt-8">
          <div className="glass-panel-dark liquid-ring rounded-[32px] px-6 py-8 text-white sm:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="section-eyebrow text-cyan-100/80">
                  <Zap className="h-4 w-4" />
                  Ready To Estimate
                </p>
                <h2 className="mt-3 text-3xl font-semibold">
                  Enter through the map for site planning, or use the guided form
                  and open the map when you need it.
                </h2>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/estimate?start=map"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950"
                >
                  Launch Map Workflow
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/estimate?start=form"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white"
                >
                  Launch Guided Form
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { LogoutButton } from '@/components/LogoutButton';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { useViewMode } from '@/lib/viewMode';
import { useHealthStatus } from '@/hooks/useHealthStatus';
import { MAP_WORKSPACE_ENABLED } from '@/lib/map/feature-flags';

const AI_FEATURES = [
  { name: 'SOW Parser', desc: 'Paste a project description and AI extracts all structured fields automatically', icon: 'NLP', color: 'var(--system-purple)' },
  { name: 'Chat Builder', desc: 'Conversational interface that asks smart follow-up questions to build the estimate', icon: 'Chat', color: 'var(--system-green)' },
  { name: 'AI Reviewer', desc: 'Senior estimator AI reviews the generated estimate for issues and missing items', icon: 'QA', color: 'var(--system-orange)' },
  { name: 'Photo Analysis', desc: 'Upload a site photo and AI identifies parking type, surface, mount options', icon: 'Cam', color: 'var(--system-blue)' },
];

const SCENARIOS = [
  { name: 'Hampton Inn Surface Lot', desc: '4x Tesla UWC, pedestal, surface lot, hotel', id: 'hampton-inn' },
  { name: 'Downtown Apartment Garage', desc: '4x Tesla UWC, wall mount, P6 garage, PT slab unknown', id: 'downtown-apartment' },
  { name: 'Mixed Environment Complex', desc: '6x ChargePoint CT4000, mixed parking, triggers review', id: 'mixed-complex' },
  { name: 'Tesla Supercharger Station', desc: '4-Stall SC package, fuel station, 480V 3-phase', id: 'supercharger-station' },
];

function StatusDot({ active, loading }: { active: boolean; loading: boolean }) {
  if (loading) return <span className="lg-dot animate-pulse" style={{ background: '#8e8e93' }} />;
  return <span className="lg-dot" style={{ background: active ? 'var(--system-green)' : 'var(--system-red)' }} />;
}

export default function HomePage() {
  const { isAdvanced } = useViewMode();
  const { services, isLoading } = useHealthStatus();

  return (
    <main className="relative min-h-screen">
      <div className="ambient-mesh" />

      <div className="mx-auto max-w-[1200px] px-5 pb-24 pt-5 sm:px-6" style={{ position: 'relative', zIndex: 1 }}>

        {/* ─── Floating Nav ──────────────────────────────────── */}
        <nav className="mb-6 flex items-center justify-between">
          <div className="lg-pill lg-ring font-semibold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--system-blue)' }}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            BulletEV
          </div>
          <div className="flex items-center gap-2">
            <ViewModeToggle />
            <LogoutButton />
          </div>
        </nav>

        {/* ─── Hero ──────────────────────────────────────────── */}
        <header className="hero-canvas lg-ring" style={{ borderRadius: 'var(--radius-xl)', padding: 'clamp(2rem, 4vw, 3.5rem) clamp(1.5rem, 3vw, 2.5rem)' }}>
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between" style={{ zIndex: 1 }}>
            <div className="max-w-2xl text-white">
              <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-white/50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="10"/></svg>
                Smart Estimate Studio
              </p>
              <h1 className="mt-4 text-[clamp(2rem,5.5vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.022em]">
                <span className="lg-gradient-text">Map-first EV estimates</span>
                <br />
                <span className="text-white/75">with transparent quoting</span>
              </h1>
              <p className="mt-5 max-w-lg text-[0.9375rem] leading-7 text-white/55">
                Combine live map planning, construction-aware project features,
                and rules-based line-item pricing in one guided experience.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {MAP_WORKSPACE_ENABLED && (
                  <Link href="/estimate/map" className="lg-pill lg-pill-active px-5 py-3 text-sm font-semibold">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    Start From Map
                  </Link>
                )}
                <Link href="/estimate" className="lg-pill border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white">
                  Guided Form
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              </div>
            </div>

            {/* Status Cards */}
            <div className="grid w-full max-w-sm gap-3 sm:grid-cols-2">
              {[
                { label: 'Catalog', active: true, loading: false },
                { label: 'AI Engine', active: services?.aiReady ?? false, loading: isLoading },
                { label: 'monday.com', active: services?.monday ?? false, loading: isLoading },
                { label: 'Map', active: services?.mapWorkspace ?? false, loading: isLoading },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3" style={{ borderRadius: 'var(--radius-md)', border: '0.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.08)', padding: '0.875rem 1rem', backdropFilter: 'blur(16px)' }}>
                  <StatusDot active={s.active} loading={s.loading} />
                  <div>
                    <p className="text-[0.8125rem] font-semibold text-white">{s.label}</p>
                    <p className="text-[0.6875rem] text-white/45">{s.loading ? 'Checking...' : s.active ? 'Connected' : 'Offline'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ─── Entry Points ──────────────────────────────────── */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/estimate" className="lg-panel lg-ring p-6 no-underline" style={{ borderRadius: 'var(--radius-lg)' }}>
            <div className="flex h-11 w-11 items-center justify-center" style={{ borderRadius: 'var(--radius-sm)', background: 'rgba(0, 122, 255, 0.1)', color: 'var(--system-blue)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <h3 className="mt-4 text-[1.0625rem] font-semibold text-gray-900">Estimate Generator</h3>
            <p className="mt-2 text-[0.8125rem] leading-6 text-gray-500">
              {isAdvanced
                ? 'AI-enhanced estimator with SOW parsing, chat builder, photo analysis, and detailed rule traces.'
                : 'Tabbed form with 12 input sections, sample scenarios, and transparent line-item pricing.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="lg-pill px-2.5 py-1 text-[0.6875rem]">12 sections</span>
              <span className="lg-pill px-2.5 py-1 text-[0.6875rem]">4 scenarios</span>
              {isAdvanced && <span className="lg-pill px-2.5 py-1 text-[0.6875rem]" style={{ background: 'rgba(175,82,222,0.1)', color: 'var(--system-purple)' }}>AI tools</span>}
            </div>
          </Link>

          {MAP_WORKSPACE_ENABLED && (
            <Link href="/estimate/map" className="lg-panel lg-ring p-6 no-underline" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div className="flex h-11 w-11 items-center justify-center" style={{ borderRadius: 'var(--radius-sm)', background: 'rgba(50, 173, 230, 0.1)', color: 'var(--system-cyan)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <h3 className="mt-4 text-[1.0625rem] font-semibold text-gray-900">Map Workspace</h3>
              <p className="mt-2 text-[0.8125rem] leading-6 text-gray-500">
                Draw conduit runs, trench paths, and place equipment on a satellite map with auto-measurement.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="lg-pill px-2.5 py-1 text-[0.6875rem]">Satellite</span>
                <span className="lg-pill px-2.5 py-1 text-[0.6875rem]">5 run types</span>
                <span className="lg-pill px-2.5 py-1 text-[0.6875rem]">Auto-measure</span>
              </div>
            </Link>
          )}

          <Link href="/debug" className="lg-panel lg-ring p-6 no-underline" style={{ borderRadius: 'var(--radius-lg)' }}>
            <div className="flex h-11 w-11 items-center justify-center" style={{ borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.04)', color: '#636366' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
            </div>
            <h3 className="mt-4 text-[1.0625rem] font-semibold text-gray-900">Debug View</h3>
            <p className="mt-2 text-[0.8125rem] leading-6 text-gray-500">
              Inspect raw JSON payloads, generated line items, manual review triggers, and the hardware catalog.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="lg-pill px-2.5 py-1 text-[0.6875rem]">Raw JSON</span>
              <span className="lg-pill px-2.5 py-1 text-[0.6875rem]">Catalog</span>
              <span className="lg-pill px-2.5 py-1 text-[0.6875rem]">Field map</span>
            </div>
          </Link>
        </section>

        {/* ─── AI Features (Advanced Mode) ───────────────────── */}
        {isAdvanced && (
          <section className="mt-6">
            <div className="lg-panel-heavy p-6 sm:p-7" style={{ borderRadius: 'var(--radius-xl)' }}>
              <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--system-purple)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                AI-Enhanced Features
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-[-0.022em] text-gray-900">
                Intelligent tools available in Advanced mode
              </h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {AI_FEATURES.map((f) => (
                  <div key={f.name} className="lg-card p-5" style={{ borderRadius: 'var(--radius-md)' }}>
                    <span className="inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-[0.6875rem] font-bold text-white" style={{ background: f.color }}>
                      {f.icon}
                    </span>
                    <p className="mt-3 text-[0.875rem] font-semibold text-gray-900">{f.name}</p>
                    <p className="mt-1.5 text-[0.8125rem] leading-6 text-gray-500">{f.desc}</p>
                  </div>
                ))}
              </div>

              {isAdvanced && services && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    { label: 'OpenAI', active: services.openai },
                    { label: 'Gemini', active: services.gemini },
                    { label: 'Street View', active: services.googleMaps },
                  ].map((s) => (
                    <div key={s.label} className="lg-pill text-[0.75rem]">
                      <StatusDot active={s.active ?? false} loading={isLoading} />
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Scenarios ─────────────────────────────────────── */}
        <section className="mt-6">
          <div className="lg-panel-heavy p-6 sm:p-7" style={{ borderRadius: 'var(--radius-xl)' }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-gray-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                  Built-In Scenarios
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-[-0.022em] text-gray-900">
                  Start from realistic EV project examples
                </h2>
              </div>
              <Link href="/estimate" className="lg-pill text-sm font-medium text-gray-700">
                Open Estimator
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SCENARIOS.map((s, i) => (
                <Link key={s.name} href={`/estimate?scenario=${s.id}`} className="lg-card p-5 no-underline" style={{ borderRadius: 'var(--radius-md)' }}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center text-[0.75rem] font-bold text-white" style={{ borderRadius: 'var(--radius-sm)', background: 'var(--system-blue)' }}>
                      0{i + 1}
                    </span>
                    <p className="text-[0.875rem] font-semibold text-gray-900">{s.name}</p>
                  </div>
                  <p className="mt-3 text-[0.8125rem] leading-6 text-gray-500">{s.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Bottom CTA ────────────────────────────────────── */}
        <section className="mt-6">
          <div className="hero-canvas lg-ring" style={{ borderRadius: 'var(--radius-xl)', padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between" style={{ zIndex: 1 }}>
              <div className="max-w-xl text-white">
                <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-white/50">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  Ready To Estimate
                </p>
                <h2 className="mt-3 text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-[1.15] tracking-[-0.022em] text-white">
                  Enter through the map or use the guided form
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {MAP_WORKSPACE_ENABLED && (
                  <Link href="/estimate/map" className="lg-pill lg-pill-active px-5 py-3 text-sm font-semibold">
                    Launch Map
                  </Link>
                )}
                <Link href="/estimate" className="lg-pill border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white">
                  Launch Form
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}

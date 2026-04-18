/**
 * TimelineSection — ported from portfolio/TimelineSection.
 * Dark band with four numbered deployment phases (design → permit → install →
 * launch). Phase data is computed by the adapter so the project's timeline
 * hint flows through to the description.
 */

import type { ProposalViewModel } from '@/lib/proposal/adapter';

interface TimelineSectionProps {
  vm: ProposalViewModel;
}

export function TimelineSection({ vm }: TimelineSectionProps) {
  const phases = vm.timeline;

  return (
    <section
      className="py-16 md:py-24 px-6 pp-bg-foreground pp-text-background"
    >
      <div className="max-w-5xl mx-auto">
        <div className="reveal text-center mb-12 md:mb-16">
          <p
            className="text-xs uppercase tracking-[0.2em] font-medium mb-3"
            style={{ color: 'hsl(var(--pp-background) / 0.55)' }}
          >
            Deployment timeline
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            {vm.site.cityRegion
              ? `From survey to live charging`
              : `Survey to live charging`}
          </h2>
          <p
            className="mt-3 text-base md:text-lg max-w-lg mx-auto"
            style={{ color: 'hsl(var(--pp-background) / 0.65)' }}
          >
            Typical {vm.totalPorts}-port deployment — {vm.charger.level === 'l3_dcfc' ? 'DC fast charging' : 'Level 2'}.
          </p>
        </div>

        {/* Desktop */}
        <ol className="reveal hidden md:grid grid-cols-4 gap-0 relative">
          {phases.map((phase, i) => (
            <li key={phase.stepNumber} className="text-center relative px-3">
              <div className="flex items-center justify-center mb-5">
                <div
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold"
                  style={{
                    borderColor: 'hsl(var(--pp-background) / 0.35)',
                    color: 'hsl(var(--pp-background))',
                  }}
                >
                  {phase.stepNumber}
                </div>
              </div>
              {i < phases.length - 1 && (
                <div
                  className="absolute top-5 left-[calc(50%+22px)] right-[calc(-50%+22px)] h-px"
                  style={{ background: 'hsl(var(--pp-background) / 0.2)' }}
                />
              )}
              <p
                className="text-[0.65rem] uppercase tracking-[0.15em] mb-2"
                style={{ color: 'hsl(var(--pp-background) / 0.55)' }}
              >
                {phase.weekLabel}
              </p>
              <p className="font-semibold text-sm mb-1">{phase.title}</p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'hsl(var(--pp-background) / 0.6)' }}
              >
                {phase.detail}
              </p>
            </li>
          ))}
        </ol>

        {/* Mobile */}
        <ol className="reveal md:hidden space-y-6">
          {phases.map((phase, i) => (
            <li key={phase.stepNumber} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div
                  className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ borderColor: 'hsl(var(--pp-background) / 0.35)' }}
                >
                  {phase.stepNumber}
                </div>
                {i < phases.length - 1 && (
                  <div
                    className="w-px h-8 mt-2"
                    style={{ background: 'hsl(var(--pp-background) / 0.25)' }}
                  />
                )}
              </div>
              <div className="pt-1">
                <p
                  className="text-[0.65rem] uppercase tracking-[0.15em] mb-1"
                  style={{ color: 'hsl(var(--pp-background) / 0.55)' }}
                >
                  {phase.weekLabel}
                </p>
                <p className="font-semibold text-sm">{phase.title}</p>
                <p
                  className="text-xs leading-relaxed mt-1"
                  style={{ color: 'hsl(var(--pp-background) / 0.6)' }}
                >
                  {phase.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default TimelineSection;

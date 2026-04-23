/**
 * PortalHero — merged ProposalHero + PortfolioHero.
 * Renders a full-bleed aerial photo of the property with the customer name,
 * headline totals, and a validity tag.
 */

import Image from 'next/image';
import type { ProposalViewModel } from '@/lib/proposal/adapter';
import { formatCurrency } from '@/lib/proposal/adapter';
import { CalendarIcon, DownloadIcon, ArrowDownIcon } from './icons';

interface PortalHeroProps {
  vm: ProposalViewModel;
  /** Optional signed URL for the site satellite photo (from site_photos). */
  aerialUrl?: string | null;
}

function formatProposalDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function PortalHero({ vm, aerialUrl }: PortalHeroProps) {
  const hero = aerialUrl ?? '/brand/property-aerial.jpg';
  const customerName = vm.customer.companyName;

  const stats: Array<{ value: string; label: string; lead?: boolean }> = [
    {
      value: formatCurrency(vm.totals.grossTotal),
      label: 'Total Investment',
      lead: true,
    },
    {
      value: `${vm.totalPorts}`,
      label: 'Charging Ports',
    },
    {
      value: formatProposalDate(vm.generatedAt),
      label: 'Prepared',
    },
  ];

  return (
    <section className="reveal relative min-h-[600px] md:min-h-[680px] flex flex-col">
      <div className="absolute inset-0">
        <Image
          src={hero}
          alt={`${customerName} aerial view`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="pp-hero-overlay absolute inset-0" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-6 md:p-10">
        <div className="flex items-center gap-3">
          <div className="bg-white/90 rounded-md px-3 py-1.5">
            <Image
              src="/brand/bulletev-logo.png"
              alt="BulletEV"
              width={120}
              height={28}
              className="h-7 w-auto"
              priority
            />
          </div>
        </div>

        <span className="clay-tag" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
          <CalendarIcon className="w-3 h-3" />
          Proposal #{vm.proposalId}
        </span>
      </div>

      {/* Centered hero content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-14 md:py-20">
        <h1
          className="pp-section-title text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-5 max-w-5xl"
          style={{ textShadow: '0 2px 24px rgba(15, 23, 42, 0.35)' }}
        >
          EV Charging
          <br />
          <span className="text-white/70">for {customerName}</span>
        </h1>
        <p className="text-white/80 text-base md:text-lg max-w-xl mb-8">
          {vm.totalPorts}-port deployment
          {vm.site.cityRegion ? ` · ${vm.site.cityRegion}` : ''}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className="clay-btn-primary press-effect px-8 py-3 text-sm"
          >
            Review This Proposal
          </button>
          <button
            type="button"
            className="clay-btn-ghost press-effect px-6 py-3 text-sm text-white"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)' }}
          >
            <DownloadIcon className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Stats bar — lead stat is the total investment, others are supporting. */}
      <div className="relative z-10 px-6 md:px-10 pb-10">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              data-lead={stat.lead ? 'true' : undefined}
              className={`pp-hero-stat rounded-xl ${
                stat.lead ? 'p-6 md:p-7' : 'p-4 md:p-5'
              }`}
            >
              <p className="text-white/65 text-[0.65rem] uppercase tracking-[0.18em] font-medium">
                {stat.label}
              </p>
              <p
                className={`text-white font-bold tabular-nums mt-1.5 ${
                  stat.lead
                    ? 'text-2xl md:text-3xl'
                    : 'text-lg md:text-xl font-semibold'
                }`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex justify-center pb-6">
        <ArrowDownIcon className="w-5 h-5 text-white/40 animate-bounce" />
      </div>
    </section>
  );
}

export default PortalHero;

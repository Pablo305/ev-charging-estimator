/**
 * SiteMapSection — static aerial preview (no drag interactivity).
 * Shows the project address with a satellite image (from site_photos where
 * available) and the full site address. Interactive map placement lives in
 * the estimator input flow and is intentionally NOT rebuilt here.
 */

import Image from 'next/image';
import type { ProposalViewModel } from '@/lib/proposal/adapter';
import { MapPinIcon, ZapIcon } from './icons';

interface SiteMapSectionProps {
  vm: ProposalViewModel;
  /** Signed Supabase Storage URL for the 'satellite' site_photo, if available. */
  aerialUrl?: string | null;
}

export function SiteMapSection({ vm, aerialUrl }: SiteMapSectionProps) {
  const mapSrc = aerialUrl ?? '/brand/property-aerial.jpg';

  return (
    <section className="py-16 md:py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="reveal text-center mb-10 md:mb-14">
          <p className="text-xs uppercase tracking-[0.2em] pp-text-muted font-medium mb-3">
            Site plan
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight pp-text-foreground">
            {vm.site.address || 'Your site'}
          </h2>
          <p className="pp-text-muted mt-3 text-base md:text-lg max-w-xl mx-auto">
            Aerial reference shown below. Exact charger placement is finalized
            during the design phase.
          </p>
        </div>

        <div
          className="reveal relative aspect-[16/9] overflow-hidden rounded-2xl"
          style={{ background: 'hsl(var(--pp-secondary))' }}
        >
          <Image
            src={mapSrc}
            alt={`Aerial view of ${vm.site.address || vm.customer.companyName}`}
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.05)' }} />

          {/* Static address pin — center of frame */}
          <div
            className="absolute top-1/2 left-1/2"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-full shadow-lg"
              style={{
                background: '#ffffff',
                color: 'hsl(var(--pp-foreground))',
              }}
            >
              <MapPinIcon className="w-3.5 h-3.5 pp-text-primary" />
              <span className="text-xs font-semibold whitespace-nowrap">
                {vm.site.cityRegion || 'Install Location'}
              </span>
              {vm.totalPorts > 0 && (
                <span className="text-[10px] opacity-60 ml-1">
                  {vm.totalPorts}p
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 mt-6 justify-center text-sm pp-text-muted">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: 'hsl(var(--pp-primary))' }}
            />
            {vm.charger.level === 'l3_dcfc' ? (
              <span className="inline-flex items-center gap-1">
                <ZapIcon className="w-3 h-3 pp-text-primary" />
                DC Fast
              </span>
            ) : (
              <span>Level 2</span>
            )}
          </div>
          {vm.site.siteType && (
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: 'hsl(var(--pp-foreground))' }}
              />
              <span className="capitalize">{vm.site.siteType.replace(/_/g, ' ')}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MapPinIcon className="w-3.5 h-3.5 pp-text-muted" />
            <span>{vm.site.address}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SiteMapSection;

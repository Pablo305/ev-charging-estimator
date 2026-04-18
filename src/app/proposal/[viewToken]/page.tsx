/**
 * Customer-facing proposal portal, token-gated public route.
 *
 *   /proposal/<customer_view_token>
 *
 * The URL token IS the authorization — there is no login. An unknown,
 * expired, or non-customer-visible estimate returns notFound().
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadEstimateByToken } from '@/lib/proposal/fetchEstimate';
import { adaptEstimateToProposal } from '@/lib/proposal/adapter';
import ProposalLayout from '@/components/proposal-portal/ProposalLayout';
import PortalHero from '@/components/proposal-portal/PortalHero';
import InvestmentBreakdown from '@/components/proposal-portal/InvestmentBreakdown';
import EquipmentShowcase from '@/components/proposal-portal/EquipmentShowcase';
import TimelineSection from '@/components/proposal-portal/TimelineSection';
import SiteMapSection from '@/components/proposal-portal/SiteMapSection';
import ProposalFooter from '@/components/proposal-portal/ProposalFooter';

// Always render on-demand — we never want a stale token view cached.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ viewToken: string }>;
}

export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const { viewToken } = await params;
  const loaded = await loadEstimateByToken(viewToken);

  if (!loaded) {
    return {
      title: 'Proposal unavailable',
      description: 'This proposal link is no longer active.',
      robots: { index: false, follow: false },
    };
  }

  const vm = adaptEstimateToProposal(loaded.output);
  return {
    title: `${vm.customer.companyName} · EV Charging Proposal`,
    description: `BulletEV ${vm.totalPorts}-port deployment proposal for ${vm.customer.companyName}.`,
    robots: { index: false, follow: false },
  };
}

export default async function ProposalPortalPage({ params }: PageProps) {
  const { viewToken } = await params;
  const loaded = await loadEstimateByToken(viewToken);
  if (!loaded) {
    notFound();
  }

  const vm = adaptEstimateToProposal(loaded.output);

  return (
    <ProposalLayout>
      <PortalHero vm={vm} aerialUrl={loaded.aerialSignedUrl} />
      <SiteMapSection vm={vm} aerialUrl={loaded.aerialSignedUrl} />
      <EquipmentShowcase vm={vm} />
      <InvestmentBreakdown vm={vm} />
      <TimelineSection vm={vm} />
      <ProposalFooter vm={vm} />
    </ProposalLayout>
  );
}

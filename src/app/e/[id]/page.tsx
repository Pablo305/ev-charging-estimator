import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadPresentationByToken } from '@/lib/presentation/fetchPresentation';
import { SharedEstimateClient } from './SharedEstimateClient';

/**
 * Public customer-facing presentation. `[id]` is the presentation share
 * token (canonical) OR a legacy shared_estimates id during rollout.
 * Either path resolves through `loadPresentationByToken`; `notFound()`
 * on unknown / expired / revoked.
 *
 * Never index this page — it's a one-to-one customer link, not content.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'BulletEV Interactive Proposal',
    description: 'Your BulletEV charging deployment proposal.',
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  };
}

export default async function SharedEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    notFound();
  }

  const bootstrap = await loadPresentationByToken(id);
  if (!bootstrap) {
    notFound();
  }

  // `legacyRecord` is the existing SharedEstimateRecord shape, populated
  // from canonical estimates.output_json (for new shares) or read straight
  // from shared_estimates (for legacy shares). Lets the React client
  // stay unchanged in this phase; Phase 8 will swap in the new shape.
  return (
    <SharedEstimateClient
      record={bootstrap.legacyRecord}
      previewUrls={bootstrap.previewUrls}
    />
  );
}

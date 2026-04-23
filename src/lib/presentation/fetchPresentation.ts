/**
 * Server-only loader for a presentation share.
 *
 * /e/[token] is the public URL. This function resolves the token to the
 * full `PresentationBootstrap` shape the page + client need, against the
 * canonical `presentation_shares` -> `estimates` -> `projects` chain.
 *
 * Fail-closed contract: returns `null` when
 *   - supabase is not configured (dev w/o env)
 *   - no matching row
 *   - row.status !== 'active'
 *   - row.expires_at is in the past
 * The caller maps `null` to `notFound()`.
 *
 * Legacy fallback: during rollout we also honor tokens that resolve to
 * the old JSON-blob `shared_estimates` row. That path returns a
 * `legacy: true` bootstrap so the page can still serve pre-Phase-2 links
 * that sales reps have already sent.
 */

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import type {
  EstimateRow,
  PresentationShareRow,
  ProjectRow,
  SharedEstimateRow,
} from '@/types/supabase';
import type { EstimateOutput } from '@/lib/estimate/types';
import type { SharedEstimateRecord } from '@/lib/estimate/shared-types';
import { resolveDisplayPreviewUrls } from '@/lib/map/static-preview-urls';
import { getSharedEstimate } from '@/lib/estimate/repository';
import { issueCapabilityToken } from './capability-token';

export interface PresentationPreviewUrls {
  satelliteStaticUrl?: string;
  streetViewStaticUrl?: string;
}

export interface PresentationBootstrap {
  kind: 'canonical' | 'legacy';
  shareId: string;
  token: string;
  status: 'active';
  expiresAt: string | null;
  capabilityToken: string;
  capabilityTokenExpiresAt: string;
  previewUrls: PresentationPreviewUrls;
  estimate: {
    id: string | null;
    versionNumber: number | null;
    output: EstimateOutput;
  };
  project: {
    id: string | null;
    name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  // Stubs for later phases — populated in Phase 4 (layout) / Phase 7 (stats).
  layoutRevision: null;
  statsSnapshot: null;
  // Used by the page to pass the existing React client unchanged.
  legacyRecord: SharedEstimateRecord;
}

function isExpired(share: PresentationShareRow, now: number): boolean {
  if (!share.expires_at) return false;
  const expMs = Date.parse(share.expires_at);
  return Number.isFinite(expMs) && expMs <= now;
}

function isActive(share: PresentationShareRow, now: number): boolean {
  return share.status === 'active' && !isExpired(share, now);
}

function buildLegacyRecord(
  id: string,
  output: EstimateOutput,
  siteCoordinates?: [number, number],
): SharedEstimateRecord {
  const nowIso = new Date().toISOString();
  return {
    id,
    createdAt: nowIso,
    updatedAt: nowIso,
    status: 'public',
    output,
    previewAssets: siteCoordinates ? { siteCoordinates } : undefined,
  };
}

function safeIssueToken(
  shareId: string,
): { token: string; expiresAt: string } {
  try {
    return issueCapabilityToken(shareId);
  } catch {
    // Dev fallback: token secret not configured. Emit a clearly-marked
    // placeholder so the page still renders; write endpoints will reject it.
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    return { token: `unsigned:${shareId}:${expiresAt}`, expiresAt };
  }
}

async function loadCanonical(
  token: string,
): Promise<PresentationBootstrap | null> {
  if (!supabaseAdmin) return null;
  const now = Date.now();

  const { data: shareData, error: shareErr } = await supabaseAdmin
    .from('presentation_shares')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (shareErr || !shareData) return null;
  const share = shareData as PresentationShareRow;
  if (!isActive(share, now)) return null;

  const { data: estData } = await supabaseAdmin
    .from('estimates')
    .select('*')
    .eq('id', share.estimate_id)
    .maybeSingle();
  const estimate = estData as EstimateRow | null;
  if (!estimate) return null;
  const output = estimate.output_json as unknown as EstimateOutput;
  if (!output || typeof output !== 'object' || !('input' in output)) {
    return null;
  }

  const { data: projData } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', share.project_id)
    .maybeSingle();
  const project = projData as ProjectRow | null;

  // Prefer project.latitude/longitude (canonical) over whatever is in
  // the output payload. Falling back to the payload only when the
  // project row doesn't have coords yet.
  const coordsFromProject: [number, number] | undefined =
    project && project.longitude != null && project.latitude != null
      ? [Number(project.longitude), Number(project.latitude)]
      : undefined;
  const coordsFromOutput = output.input.mapWorkspace?.siteCoordinates;
  const siteCoordinates: [number, number] | undefined =
    coordsFromProject ?? coordsFromOutput ?? undefined;

  const previewUrls = resolveDisplayPreviewUrls(
    siteCoordinates ? { siteCoordinates } : undefined,
  );
  const { token: capabilityToken, expiresAt: capabilityTokenExpiresAt } =
    safeIssueToken(share.id);

  return {
    kind: 'canonical',
    shareId: share.id,
    token: share.token,
    status: 'active',
    expiresAt: share.expires_at,
    capabilityToken,
    capabilityTokenExpiresAt,
    previewUrls,
    estimate: {
      id: estimate.id,
      versionNumber: estimate.version_number,
      output,
    },
    project: {
      id: project?.id ?? null,
      name: project?.name ?? null,
      address: project?.address ?? null,
      city: project?.city ?? null,
      state: project?.state ?? null,
      zip: project?.zip ?? null,
      latitude: project?.latitude ?? null,
      longitude: project?.longitude ?? null,
    },
    layoutRevision: null,
    statsSnapshot: null,
    legacyRecord: buildLegacyRecord(share.token, output, siteCoordinates),
  };
}

async function loadLegacy(
  token: string,
): Promise<PresentationBootstrap | null> {
  const record = await getSharedEstimate(token);
  if (!record) return null;
  if (record.status === 'revoked') return null;

  const siteCoordinates =
    record.previewAssets?.siteCoordinates ??
    record.output.input.mapWorkspace?.siteCoordinates;
  const previewUrls = resolveDisplayPreviewUrls(record.previewAssets);
  const { token: capabilityToken, expiresAt: capabilityTokenExpiresAt } =
    safeIssueToken(record.id);

  return {
    kind: 'legacy',
    shareId: record.id,
    token: record.id,
    status: 'active',
    expiresAt: null,
    capabilityToken,
    capabilityTokenExpiresAt,
    previewUrls,
    estimate: {
      id: null,
      versionNumber: null,
      output: record.output,
    },
    project: {
      id: null,
      name: record.output.input.project?.name ?? null,
      address: null,
      city: null,
      state: null,
      zip: null,
      latitude: siteCoordinates?.[1] ?? null,
      longitude: siteCoordinates?.[0] ?? null,
    },
    layoutRevision: null,
    statsSnapshot: null,
    legacyRecord: record,
  };
}

/**
 * Primary entry point. Token may be:
 *   - a canonical `presentation_shares.token`
 *   - or (legacy fallback) a `shared_estimates.id` from a pre-Phase-2 link
 *
 * Returns `null` when the share doesn't exist, is expired, or is revoked.
 */
export async function loadPresentationByToken(
  token: string,
): Promise<PresentationBootstrap | null> {
  if (!token || typeof token !== 'string') return null;
  const canonical = await loadCanonical(token);
  if (canonical) return canonical;
  return loadLegacy(token);
}

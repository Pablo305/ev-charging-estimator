/**
 * Server-only helpers for loading an estimate by customer_view_token.
 *
 * Auth model: the token in the URL IS the authorization. We query via the
 * service-role client (supabaseAdmin) and filter explicitly by the token +
 * status ∈ ('sent', 'accepted') to mirror what the RLS `estimates_customer_
 * token_read` policy allows. This keeps the code path simple while the app
 * standardizes on a single Supabase SDK version; when we adopt `@supabase/ssr`
 * we can swap to a request-scoped anon client that passes the token header.
 */

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import type { EstimateOutput } from '@/lib/estimate/types';
import type { EstimateRow, SitePhotoRow } from '@/types/supabase';

export interface LoadedEstimate {
  row: EstimateRow;
  output: EstimateOutput;
  aerialSignedUrl: string | null;
}

const CUSTOMER_VISIBLE_STATUSES = ['sent', 'accepted'] as const;

/**
 * Look up an estimate by customer_view_token. Returns `null` if the token is
 * unknown, the estimate isn't in a customer-visible status, or Supabase is not
 * configured (dev environments without env vars).
 */
export async function loadEstimateByToken(
  viewToken: string
): Promise<LoadedEstimate | null> {
  if (!viewToken || typeof viewToken !== 'string') {
    return null;
  }

  if (!supabaseAdmin) {
    // Supabase is not configured; the route surfaces a notFound() for this.
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('estimates')
    .select('*')
    .eq('customer_view_token', viewToken)
    .in('status', CUSTOMER_VISIBLE_STATUSES as unknown as string[])
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // The typed client narrows generics to `never` when filter chains span
  // enums; assert back to the canonical Row type we maintain in types/supabase.
  const row = data as EstimateRow;

  const output = row.output_json as unknown as EstimateOutput;
  if (!output || typeof output !== 'object' || !('input' in output)) {
    // Malformed payload — treat as not-found.
    return null;
  }

  const aerialSignedUrl = await fetchAerialSignedUrl(row.project_id);

  return {
    row,
    output,
    aerialSignedUrl,
  };
}

/**
 * Look up the latest 'satellite' site_photo for a project and return a signed
 * URL suitable for the customer-facing portal. Non-fatal on failure.
 */
async function fetchAerialSignedUrl(projectId: string): Promise<string | null> {
  if (!supabaseAdmin) return null;

  try {
    const { data: photoData } = await supabaseAdmin
      .from('site_photos')
      .select('storage_path')
      .eq('project_id', projectId)
      .eq('kind', 'satellite')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const photo = photoData as Pick<SitePhotoRow, 'storage_path'> | null;
    if (!photo?.storage_path) return null;

    const bucket = inferBucketFromPath(photo.storage_path);
    const objectPath = stripBucketPrefix(photo.storage_path, bucket);

    const { data: signed } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(objectPath, 60 * 60 /* 1 hour */);

    return signed?.signedUrl ?? null;
  } catch {
    return null;
  }
}

function inferBucketFromPath(storagePath: string): string {
  // Conventional shape in storage_path is "bucket/path/to/file".
  const [first] = storagePath.split('/', 1);
  return first || 'project-photos';
}

function stripBucketPrefix(storagePath: string, bucket: string): string {
  if (storagePath.startsWith(`${bucket}/`)) {
    return storagePath.slice(bucket.length + 1);
  }
  return storagePath;
}

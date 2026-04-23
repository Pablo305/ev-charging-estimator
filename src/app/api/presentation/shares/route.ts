/**
 * POST /api/presentation/shares
 *
 * Sales-rep-only endpoint that creates a new presentation_shares row for
 * an existing canonical estimate. Returns { id, token, url } so the rep
 * can immediately share the /e/<token> URL.
 *
 * Auth: mirrors the existing bulletev-auth cookie session used by the
 * other admin/sales-rep POST routes (e.g. /api/media/render).
 *
 * The token stored in the DB is a 32-byte random string, base64url
 * encoded (43 chars). That goes in the URL path as /e/<token>.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';
import type { PresentationShareRow } from '@/types/supabase';
import { isAuthenticated } from '@/lib/auth/session';

interface CreateShareBody {
  estimateId: string;
  expiresAt?: string | null;
}

function validateBody(raw: unknown): CreateShareBody | string {
  if (typeof raw !== 'object' || raw === null) return 'body must be an object';
  const b = raw as Record<string, unknown>;
  if (typeof b.estimateId !== 'string' || b.estimateId.length === 0) {
    return 'estimateId required';
  }
  const expiresAt =
    typeof b.expiresAt === 'string' && b.expiresAt.length > 0
      ? b.expiresAt
      : null;
  if (expiresAt && Number.isNaN(Date.parse(expiresAt))) {
    return 'expiresAt must be an ISO-8601 string';
  }
  return { estimateId: b.estimateId, expiresAt };
}

function generateToken(): string {
  return randomBytes(32)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 500 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const parsed = validateBody(raw);
  if (typeof parsed === 'string') {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  // Find the estimate (and infer project_id for the share row).
  const { data: estData, error: estErr } = await supabaseAdmin
    .from('estimates')
    .select('id, project_id, sales_rep_id')
    .eq('id', parsed.estimateId)
    .maybeSingle();
  if (estErr || !estData) {
    return NextResponse.json({ error: 'estimate not found' }, { status: 404 });
  }
  const estimate = estData as {
    id: string;
    project_id: string;
    sales_rep_id: string | null;
  };

  const token = generateToken();
  // Cast-to-any mirrors the pattern used elsewhere for service-role
  // writes (see capture-service.ts, ai-render.ts). The typed Supabase
  // `.insert()` overload resolves to `never` under the current generic
  // inference for this project; runtime constraints still apply via
  // the DB check/unique/FK constraints.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertRow: any = {
    estimate_id: estimate.id,
    project_id: estimate.project_id,
    created_by: estimate.sales_rep_id,
    token,
    status: 'active',
    expires_at: parsed.expiresAt,
  };
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('presentation_shares')
    .insert(insertRow)
    .select('*')
    .single();
  if (insErr || !inserted) {
    return NextResponse.json(
      { error: `insert failed: ${insErr?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }
  const share = inserted as PresentationShareRow;

  return NextResponse.json({
    success: true,
    id: share.id,
    token: share.token,
    url: `/e/${share.token}`,
    expiresAt: share.expires_at,
  });
}

/**
 * POST /api/estimate/share
 *
 * Legacy public-share endpoint — creates a row in `shared_estimates`
 * keyed by a random id, returned as `/e/<id>`. During Phase 2 rollout
 * the canonical path is `POST /api/presentation/shares`; this endpoint
 * still exists so the sales-rep UI flows that haven't been migrated
 * keep working.
 *
 * Phase 2.5.5 abuse controls:
 *   - session-cookie auth required (previously anonymous — let any
 *     caller persist an arbitrary payload)
 *   - 64 KB body-size cap enforced from the Content-Length header
 *     (defense-in-depth on top of platform limits)
 *   - per-IP rate limit
 */

import { NextRequest, NextResponse } from 'next/server';
import type { EstimateOutput } from '@/lib/estimate/types';
import { buildShareCoordinatesFromOutput } from '@/lib/map/static-preview-urls';
import { createSharedEstimate } from '@/lib/estimate/repository';
import { isAuthenticated } from '@/lib/auth/session';
import { createRateLimiter, getClientIp } from '@/lib/auth/rate-limit';

const MAX_BODY_BYTES = 64 * 1024;
const RPM_LIMIT = Math.max(
  1,
  Number.parseInt(process.env.SHARE_CREATE_RPM ?? '10', 10) || 10,
);

const limiter = createRateLimiter({
  key: 'share-create',
  windowMs: 60_000,
  max: RPM_LIMIT,
});

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const allowed = limiter.check(ip);
  if (!allowed.ok) {
    return NextResponse.json(
      { error: 'rate limited', retryAfterSec: allowed.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(allowed.retryAfterSec) } },
    );
  }

  const lenHeader = request.headers.get('content-length');
  if (lenHeader) {
    const bytes = Number.parseInt(lenHeader, 10);
    if (Number.isFinite(bytes) && bytes > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'payload too large', maxBytes: MAX_BODY_BYTES },
        { status: 413 },
      );
    }
  }

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'payload too large', maxBytes: MAX_BODY_BYTES },
        { status: 413 },
      );
    }

    let body: { output?: EstimateOutput } | null = null;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 });
    }
    const output = body?.output;
    if (!output || typeof output !== 'object' || !output.input || !output.lineItems) {
      return NextResponse.json(
        { error: 'Invalid body: { output: EstimateOutput } required' },
        { status: 400 },
      );
    }

    // Persist coordinates only; never embed static-map URLs (would leak
    // API keys to anyone with the share URL + violate Google imagery terms).
    // Display-side builds the URLs on demand at render time.
    const previewAssets = buildShareCoordinatesFromOutput(output);
    const record = await createSharedEstimate({
      output,
      previewAssets: Object.keys(previewAssets).length ? previewAssets : undefined,
      status: 'public',
    });

    return NextResponse.json({
      id: record.id,
      url: `/e/${record.id}`,
      createdAt: record.createdAt,
    });
  } catch (err: unknown) {
    console.error('Share estimate error:', err);
    return NextResponse.json({ error: 'Failed to save. Please try again.' }, { status: 500 });
  }
}

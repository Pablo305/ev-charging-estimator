/**
 * GET /api/live/monday-item/[id]
 *
 * Proxy for Monday.com item lookup. The server-side MONDAY_API_TOKEN
 * is used to call Monday's GraphQL API, and the raw item payload is
 * returned to the caller. That makes this a privileged integration
 * proxy — must be:
 *
 *   - authenticated (session cookie required)
 *   - rate-limited per-IP so an auth'd user can't be turned into a
 *     reflector against our Monday quota or a data-exfil channel.
 *
 * Before Phase 2.5.3 this route was anonymous. Any internet user could
 * page through IDs and read item data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth/session';
import { createRateLimiter, getClientIp } from '@/lib/auth/rate-limit';

const RPM_LIMIT = Math.max(
  1,
  Number.parseInt(process.env.MONDAY_ITEM_RPM ?? '30', 10) || 30,
);

const limiter = createRateLimiter({
  key: 'monday-item',
  windowMs: 60_000,
  max: RPM_LIMIT,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  }

  const token = process.env.MONDAY_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error: 'MONDAY_API_TOKEN not configured',
        hint: 'Set MONDAY_API_TOKEN environment variable to enable live monday.com integration',
      },
      { status: 501 },
    );
  }

  console.info('[monday-item] access', { id, ip });

  try {
    const query = `
      query ($itemId: [ID!]) {
        items(ids: $itemId) {
          id
          name
          column_values {
            id
            value
            text
          }
        }
      }
    `;

    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({
        query,
        variables: { itemId: [id] },
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `monday.com API returned ${response.status}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    const item = data?.data?.items?.[0];

    if (!item) {
      return NextResponse.json(
        { error: `Item ${id} not found` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      raw: item,
      note: 'Use /api/generate-estimate with normalized input to generate estimate',
    });
  } catch (err: unknown) {
    console.error('Monday item fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch project data' },
      { status: 500 },
    );
  }
}

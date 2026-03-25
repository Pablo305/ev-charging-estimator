import { NextResponse } from 'next/server';
import { getSharedEstimate, revokeSharedEstimate } from '@/lib/estimate/repository';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const record = await getSharedEstimate(id);
    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Revoke a shared estimate (requires `Authorization: Bearer <SECRET>` when
 * `ESTIMATE_SHARE_REVOKE_SECRET` is set; otherwise allows revoke in dev only).
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const secret = process.env.ESTIMATE_SHARE_REVOKE_SECRET;
    if (secret) {
      const auth = request.headers.get('authorization');
      const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
      if (token !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Revoke is not configured. Set ESTIMATE_SHARE_REVOKE_SECRET.' },
        { status: 503 },
      );
    }

    const ok = await revokeSharedEstimate(id);
    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

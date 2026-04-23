/**
 * Regression guard: the POST /api/presentation/shares route must fail
 * closed when SESSION_SECRET is unset or too short. The previous version
 * fell back to a hard-coded literal, so forging a cookie bypassed auth.
 *
 * We import the route handler directly and call it with a mock
 * NextRequest. No Supabase round-trip is needed — the 401 is returned
 * before any DB call.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// Stub Supabase: if the handler ever gets past the auth check in a
// misconfigured env, we want the test to notice (it'll try to hit this).
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => {
      throw new Error('should not reach DB without valid session');
    },
  },
}));

import { POST } from '@/app/api/presentation/shares/route';

function mockRequest(cookieValue: string | null): {
  cookies: { get: (name: string) => { value: string } | undefined };
  json: () => Promise<unknown>;
} {
  return {
    cookies: {
      get: (name: string) =>
        name === 'bulletev-auth' && cookieValue !== null
          ? { value: cookieValue }
          : undefined,
    },
    json: async () => ({ estimateId: 'est-123' }),
  };
}

describe('POST /api/presentation/shares — auth fail-closed', () => {
  beforeEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it('rejects with 401 when SESSION_SECRET is unset (no fallback)', async () => {
    // Forge the old fallback value — if the route still defaults to it,
    // this would (incorrectly) authenticate.
    const req = mockRequest('bulletev-session-v1');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('rejects with 401 when SESSION_SECRET is shorter than the minimum', async () => {
    process.env.SESSION_SECRET = 'short';
    const req = mockRequest('short');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('rejects with 401 when the cookie is absent', async () => {
    process.env.SESSION_SECRET = 'a-real-secret-longer-than-16-chars';
    const req = mockRequest(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('rejects with 401 when the cookie value does not match', async () => {
    process.env.SESSION_SECRET = 'a-real-secret-longer-than-16-chars';
    const req = mockRequest('some-other-value-of-same-length');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });
});

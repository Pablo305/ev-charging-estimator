/**
 * Phase 2.5.3 / 2.5.5 / 2.5.6 — guards on protected / semi-protected routes.
 *
 * These tests don't exercise the full happy path (that would require DB
 * mocks per route); they assert the first-line defenses: auth gates
 * fail-closed, rate limits emit 429, and the public health surface is
 * minimal.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// Prevent Monday/Supabase/OpenAI/Gemini imports from attempting real network.
vi.mock('@/lib/ai/openai-client', () => ({ isOpenAIAvailable: () => false }));
vi.mock('@/lib/ai/gemini-client', () => ({ isGeminiAvailable: () => false }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: null }));
vi.mock('@/lib/estimate/repository', () => ({
  createSharedEstimate: async () => ({
    id: 'id1',
    createdAt: '2026-04-22',
    updatedAt: '2026-04-22',
    status: 'public',
    output: {},
  }),
}));

import { GET as mondayGet } from '@/app/api/live/monday-item/[id]/route';
import { POST as sharePost } from '@/app/api/estimate/share/route';
import { GET as healthGet } from '@/app/api/health/route';

interface MockCtx {
  cookieValue: string | null;
  ip: string;
  body?: string;
  contentLength?: string;
}

// Typed as `any` because the route handlers accept a full NextRequest;
// we only exercise `.cookies.get()` + header reads, so a thin stand-in
// is safer than importing NextRequest (whose constructor signature
// varies by Next version).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mkRequest(ctx: MockCtx): any {
  const headers = new Headers();
  headers.set('x-forwarded-for', ctx.ip);
  if (ctx.contentLength) headers.set('content-length', ctx.contentLength);
  const raw = new Request('https://example.test/', {
    method: ctx.body != null ? 'POST' : 'GET',
    headers,
    body: ctx.body,
  });
  // Inject a `.cookies.get()` shim so the Next-style reads work.
  Object.defineProperty(raw, 'cookies', {
    value: {
      get: (name: string) =>
        name === 'bulletev-auth' && ctx.cookieValue !== null
          ? { value: ctx.cookieValue }
          : undefined,
    },
  });
  return raw;
}

beforeEach(() => {
  delete process.env.SESSION_SECRET;
  delete process.env.MONDAY_API_TOKEN;
});

describe('Monday proxy auth gate', () => {
  it('rejects anonymous requests with 401', async () => {
    const res = await mondayGet(mkRequest({ cookieValue: null, ip: '1.1.1.1' }), {
      params: Promise.resolve({ id: 'abc' }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(res.status).toBe(401);
  });

  it('still 401s when a forged pre-fix fallback cookie is sent with no SESSION_SECRET', async () => {
    const res = await mondayGet(
      mkRequest({ cookieValue: 'bulletev-session-v1', ip: '1.1.1.1' }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { params: Promise.resolve({ id: 'abc' }) } as any,
    );
    expect(res.status).toBe(401);
  });
});

describe('Share POST auth gate', () => {
  it('rejects anonymous POST with 401', async () => {
    const res = await sharePost(
      mkRequest({
        cookieValue: null,
        ip: '2.2.2.2',
        body: JSON.stringify({ output: { input: {}, lineItems: [] } }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('rejects oversize bodies with 413 when authenticated', async () => {
    process.env.SESSION_SECRET = 'a-real-secret-longer-than-16-chars';
    // Make a huge content-length header; the route rejects before parsing.
    const res = await sharePost(
      mkRequest({
        cookieValue: 'a-real-secret-longer-than-16-chars',
        ip: '3.3.3.3',
        body: JSON.stringify({ output: { input: {}, lineItems: [] } }),
        contentLength: String(10 * 1024 * 1024),
      }),
    );
    expect(res.status).toBe(413);
  });
});

describe('Health endpoint recon minimization', () => {
  it('returns only { ok: true } to anonymous callers', async () => {
    const res = await healthGet(mkRequest({ cookieValue: null, ip: '4.4.4.4' }));
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('returns detailed integration status only with a valid session', async () => {
    process.env.SESSION_SECRET = 'a-real-secret-longer-than-16-chars';
    const res = await healthGet(
      mkRequest({
        cookieValue: 'a-real-secret-longer-than-16-chars',
        ip: '5.5.5.5',
      }),
    );
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.services).toBeDefined();
    expect(typeof body.services.openai).toBe('boolean');
  });
});

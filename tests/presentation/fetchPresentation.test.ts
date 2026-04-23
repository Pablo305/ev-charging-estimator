/**
 * loadPresentationByToken — canonical path tests.
 *
 * We mock `@/lib/supabase` so we can script the responses from
 * presentation_shares / estimates / projects without touching a real DB.
 * The legacy-fallback path is separately covered by ensuring the loader
 * returns null when the canonical lookup returns null and the legacy
 * `getSharedEstimate` also returns null.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// `server-only` is a Next.js compile-time marker that blocks the module
// from being bundled on the client. It's not a real package at runtime
// in the test environment, so stub it.
vi.mock('server-only', () => ({}));

type Row = Record<string, unknown>;

const state: {
  share: Row | null;
  estimate: Row | null;
  project: Row | null;
  shareErr?: { message: string };
} = { share: null, estimate: null, project: null };

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => ({
    select: (_cols: string) => ({
      eq: (_col: string, _val: string) => ({
        maybeSingle: async () => {
          if (table === 'presentation_shares') {
            return { data: state.share, error: state.shareErr ?? null };
          }
          if (table === 'estimates') {
            return { data: state.estimate, error: null };
          }
          if (table === 'projects') {
            return { data: state.project, error: null };
          }
          return { data: null, error: null };
        },
      }),
    }),
  });
  return {
    supabaseAdmin: { from },
  };
});

vi.mock('@/lib/estimate/repository', () => ({
  getSharedEstimate: async () => null,
}));

// Import after mocks so the module picks them up.
import { loadPresentationByToken } from '@/lib/presentation/fetchPresentation';

const VALID_OUTPUT = {
  input: {
    mapWorkspace: { siteCoordinates: [-80.19, 25.76] as [number, number] },
    project: { name: 'Test Site' },
  },
};

describe('loadPresentationByToken', () => {
  beforeEach(() => {
    state.share = null;
    state.estimate = null;
    state.project = null;
    state.shareErr = undefined;
    process.env.PRESENTATION_TOKEN_SECRET = 'unit-test-secret-abcdefghij';
  });

  it('returns a canonical bootstrap for an active share', async () => {
    state.share = {
      id: 'share-1',
      estimate_id: 'est-1',
      project_id: 'proj-1',
      token: 'tok_active',
      status: 'active',
      expires_at: null,
      revoked_at: null,
      created_by: null,
      metadata: {},
      created_at: '2026-04-22T00:00:00Z',
      updated_at: '2026-04-22T00:00:00Z',
    };
    state.estimate = {
      id: 'est-1',
      project_id: 'proj-1',
      version_number: 2,
      output_json: VALID_OUTPUT,
    };
    state.project = {
      id: 'proj-1',
      name: 'Test Site',
      address: '123 Main',
      city: 'Miami',
      state: 'FL',
      zip: '33101',
      latitude: 25.76,
      longitude: -80.19,
    };

    const result = await loadPresentationByToken('tok_active');
    expect(result).not.toBeNull();
    expect(result?.kind).toBe('canonical');
    expect(result?.shareId).toBe('share-1');
    expect(result?.estimate.id).toBe('est-1');
    expect(result?.estimate.versionNumber).toBe(2);
    expect(result?.project.id).toBe('proj-1');
    expect(typeof result?.capabilityToken).toBe('string');
    expect(Date.parse(result!.capabilityTokenExpiresAt)).toBeGreaterThan(
      Date.now(),
    );
    // Legacy record is synthesized so the React client stays unchanged.
    expect(result?.legacyRecord.output).toEqual(VALID_OUTPUT);
    expect(result?.legacyRecord.previewAssets?.siteCoordinates).toEqual([
      -80.19, 25.76,
    ]);
  });

  it('fails closed (null) on revoked shares', async () => {
    state.share = {
      id: 'share-2',
      estimate_id: 'est-2',
      project_id: 'proj-2',
      token: 'tok_revoked',
      status: 'revoked',
      expires_at: null,
      revoked_at: '2026-04-22T00:00:00Z',
      created_by: null,
      metadata: {},
      created_at: '2026-04-22T00:00:00Z',
      updated_at: '2026-04-22T00:00:00Z',
    };
    state.estimate = { id: 'est-2', output_json: VALID_OUTPUT };

    const result = await loadPresentationByToken('tok_revoked');
    expect(result).toBeNull();
  });

  it('fails closed on expired shares', async () => {
    state.share = {
      id: 'share-3',
      estimate_id: 'est-3',
      project_id: 'proj-3',
      token: 'tok_expired',
      status: 'active',
      expires_at: '2000-01-01T00:00:00Z',
      revoked_at: null,
      created_by: null,
      metadata: {},
      created_at: '2026-04-22T00:00:00Z',
      updated_at: '2026-04-22T00:00:00Z',
    };
    state.estimate = { id: 'est-3', output_json: VALID_OUTPUT };

    const result = await loadPresentationByToken('tok_expired');
    expect(result).toBeNull();
  });

  it('returns null for unknown tokens (and legacy fallback also null)', async () => {
    state.share = null;
    const result = await loadPresentationByToken('tok_missing');
    expect(result).toBeNull();
  });

  it('rejects malformed output_json', async () => {
    state.share = {
      id: 'share-4',
      estimate_id: 'est-4',
      project_id: 'proj-4',
      token: 'tok_bad_payload',
      status: 'active',
      expires_at: null,
      revoked_at: null,
      created_by: null,
      metadata: {},
      created_at: '2026-04-22T00:00:00Z',
      updated_at: '2026-04-22T00:00:00Z',
    };
    state.estimate = { id: 'est-4', output_json: { bogus: true } };
    const result = await loadPresentationByToken('tok_bad_payload');
    expect(result).toBeNull();
  });

  it('ignores empty or non-string tokens', async () => {
    expect(await loadPresentationByToken('')).toBeNull();
    // @ts-expect-error invalid runtime input
    expect(await loadPresentationByToken(null)).toBeNull();
  });
});

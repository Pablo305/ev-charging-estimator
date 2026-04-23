import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderSiteWithChargers } from '@/lib/media/ai-render';

/** Mirrors the actual `renderings` table row shape (post-Phase 1 fix). */
interface InsertedRow {
  project_id: string;
  source_photo_id: string;
  requested_by: string | null;
  model_used: string | null;
  prompt: string | null;
  status: string;
  storage_path: string | null;
  error: string | null;
  cost_usd: number;
  metadata: Record<string, unknown>;
}

function makeMockSupabase() {
  const inserted: InsertedRow[] = [];
  const priorRows: Array<{ cost_usd: number }> = [];

  const client = {
    from(_table: string) {
      return {
        insert(row: InsertedRow) {
          return {
            select(_cols: string) {
              return {
                single: async () => {
                  const saved = { ...row, id: `row-${inserted.length + 1}` };
                  inserted.push(saved);
                  return { data: saved, error: null };
                },
              };
            },
          };
        },
        select(_cols: string) {
          return {
            eq: async (_col: string, _val: string) => ({
              data: priorRows,
              error: null,
            }),
          };
        },
      };
    },
  };

  return { client, inserted, priorRows };
}

describe('renderSiteWithChargers', () => {
  beforeEach(() => {
    delete process.env.AI_RENDERING_ENABLED;
    delete process.env.AI_RENDER_PROVIDER;
    delete process.env.AI_RENDER_MAX_USD_PER_PROJECT;
  });

  it('when disabled via env, returns failed row with AI rendering disabled', async () => {
    process.env.AI_RENDERING_ENABLED = 'false';
    process.env.AI_RENDER_PROVIDER = 'disabled';

    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const { client, inserted } = makeMockSupabase();

    const result = await renderSiteWithChargers(
      {
        projectId: 'p1',
        sourcePhotoId: 's1',
        chargerPlacements: [{ id: 'c1', lat: 25.76, lng: -80.19 }],
        chargerModel: 'ChargePoint CP6000',
      },
      client,
    );

    expect(result.status).toBe('failed');
    expect(result.error).toBe('AI rendering disabled');
    expect(result.cost_usd).toBe(0);
    expect(result.model_used).toBeNull();
    expect(result.metadata.provider).toBe('disabled');

    // One row inserted, no provider fetch.
    expect(inserted).toHaveLength(1);
    expect(inserted[0].status).toBe('failed');
    expect(inserted[0].source_photo_id).toBe('s1');
    expect(inserted[0].storage_path).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();

    globalThis.fetch = originalFetch;
  });

  it('when enabled, queues a rendering with provider envelope + model_used populated', async () => {
    process.env.AI_RENDERING_ENABLED = 'true';
    process.env.AI_RENDER_PROVIDER = 'gemini_2_5_flash_image';
    process.env.GEMINI_API_KEY = 'test-key';

    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const { client, inserted } = makeMockSupabase();

    const result = await renderSiteWithChargers(
      {
        projectId: 'p2',
        sourcePhotoId: 's2',
        chargerPlacements: [{ id: 'c1', lat: 25.76, lng: -80.19 }],
      },
      client,
    );

    expect(result.status).toBe('queued');
    expect(result.error).toBeNull();
    expect(result.metadata.provider).toBe('gemini_2_5_flash_image');
    expect(result.metadata.endpoint).toContain('generativelanguage.googleapis.com');
    expect(result.model_used).toBe('gemini-2.5-flash-image');
    expect(typeof result.prompt).toBe('string');
    expect(inserted).toHaveLength(1);
    expect(inserted[0].source_photo_id).toBe('s2');

    // We do NOT call the provider here — the worker picks up the queued row.
    expect(fetchSpy).not.toHaveBeenCalled();

    globalThis.fetch = originalFetch;
  });

  it('legacy AI_RENDER_PROVIDER=openai_dalle3 resolves to current openai_gpt_image model', async () => {
    process.env.AI_RENDERING_ENABLED = 'true';
    process.env.AI_RENDER_PROVIDER = 'openai_dalle3';
    process.env.OPENAI_API_KEY = 'test-key';

    const { client } = makeMockSupabase();

    const result = await renderSiteWithChargers(
      {
        projectId: 'p-legacy',
        sourcePhotoId: 's-legacy',
        chargerPlacements: [{ id: 'c1', lat: 25.76, lng: -80.19 }],
      },
      client,
    );

    expect(result.status).toBe('queued');
    expect(result.metadata.provider).toBe('openai_gpt_image');
    // Centralized model resolver — update PROVIDER_MODEL_ID to change.
    expect(result.model_used).toBe('gpt-image-2');
  });

  it('short-circuits when prior spend exceeds cap', async () => {
    process.env.AI_RENDERING_ENABLED = 'true';
    process.env.AI_RENDER_PROVIDER = 'gemini_2_5_flash_image';
    process.env.AI_RENDER_MAX_USD_PER_PROJECT = '1';

    const { client, inserted, priorRows } = makeMockSupabase();
    priorRows.push({ cost_usd: 0.75 });
    priorRows.push({ cost_usd: 0.5 }); // total = 1.25 > 1

    const result = await renderSiteWithChargers(
      {
        projectId: 'p3',
        sourcePhotoId: 's3',
        chargerPlacements: [{ id: 'c1', lat: 25.76, lng: -80.19 }],
      },
      client,
    );

    expect(result.status).toBe('failed');
    expect(result.error).toBe('budget_exceeded');
    expect(inserted).toHaveLength(1);
  });
});

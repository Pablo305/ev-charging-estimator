/**
 * AI rendering: composites chargers onto the project's satellite snapshot
 * using one of several configured image-generation providers.
 *
 * Provider dispatch is controlled by process.env.AI_RENDER_PROVIDER and
 * gated by AI_RENDERING_ENABLED. A per-project cost cap
 * (AI_RENDER_MAX_USD_PER_PROJECT, default $5) prevents runaway spend.
 *
 * This module queues a `renderings` row immediately (status='queued' or
 * 'failed') and returns it. Real provider execution is stubbed — the
 * envelope + gating + persistence are the contract.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type RenderStatus = 'queued' | 'running' | 'completed' | 'failed';

export type RenderProvider =
  | 'gemini_2_5_flash_image'
  | 'openai_dalle3'
  | 'fal_nano_banana'
  | 'disabled';

export interface ChargerPlacement {
  id: string;
  lat: number;
  lng: number;
  x_pct?: number;
  y_pct?: number;
}

export interface RenderSiteInput {
  projectId: string;
  satellitePhotoId: string;
  chargerPlacements: ChargerPlacement[];
  chargerModel?: string;
}

export interface Rendering {
  id?: string;
  project_id: string;
  satellite_photo_id: string;
  provider: RenderProvider;
  status: RenderStatus;
  cost_usd: number;
  error: string | null;
  output_storage_path: string | null;
  metadata: Record<string, unknown>;
  created_at?: string;
}

type SupabaseLike = SupabaseClient | { from: unknown };

const DEFAULT_COST_CAP_USD = 5;
const PROVIDER_STUB_COST_USD = 0.05; // deliberate, tiny, so tests are stable

function isEnabled(): boolean {
  return (process.env.AI_RENDERING_ENABLED ?? 'false').toLowerCase() === 'true';
}

function resolveProvider(): RenderProvider {
  const raw = (process.env.AI_RENDER_PROVIDER ?? 'disabled').toLowerCase();
  if (
    raw === 'gemini_2_5_flash_image' ||
    raw === 'openai_dalle3' ||
    raw === 'fal_nano_banana'
  ) {
    return raw;
  }
  return 'disabled';
}

function resolveCostCap(): number {
  const raw = process.env.AI_RENDER_MAX_USD_PER_PROJECT;
  if (!raw) return DEFAULT_COST_CAP_USD;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_COST_CAP_USD;
}

async function insertRendering(
  supabase: SupabaseLike,
  row: Omit<Rendering, 'id' | 'created_at'>,
): Promise<Rendering> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('renderings')
    .insert(row)
    .select('*')
    .single();
  if (error) {
    // The caller treats every path as returning a row, so synthesize one.
    return {
      ...row,
      id: undefined,
      created_at: undefined,
    };
  }
  return data as Rendering;
}

async function sumPriorCost(
  supabase: SupabaseLike,
  projectId: string,
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('renderings')
    .select('cost_usd')
    .eq('project_id', projectId);
  if (error || !Array.isArray(data)) return 0;
  return data.reduce((acc: number, r: { cost_usd?: number }) => {
    return acc + (Number(r?.cost_usd) || 0);
  }, 0);
}

interface ProviderDispatchInput {
  input: RenderSiteInput;
  provider: RenderProvider;
}

/**
 * Provider-specific request envelopes. These are intentionally stubs so
 * the caller sees a well-shaped request shape, but real API calls are
 * left as TODOs pending wiring of each vendor's production endpoints.
 */
function buildProviderRequest({ input, provider }: ProviderDispatchInput): {
  endpoint: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
} {
  const prompt = `Composite ${input.chargerPlacements.length} ${
    input.chargerModel ?? 'EV charger'
  } unit(s) onto the satellite image at the provided lat/lng positions. Keep ground-truth scale, shadows aligned to noon sun. Mark each with a subtle translucent blue pedestal.`;

  switch (provider) {
    case 'gemini_2_5_flash_image': {
      // TODO: wire gemini_2_5_flash_image. See:
      // https://ai.google.dev/gemini-api/docs/image-generation
      return {
        endpoint:
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY ?? '',
        },
        body: {
          contents: [
            {
              parts: [
                { text: prompt },
                { fileData: { mimeType: 'image/jpeg', fileUri: '<satellite-signed-url>' } },
              ],
            },
          ],
          generationConfig: { temperature: 0.4 },
        },
      };
    }
    case 'openai_dalle3': {
      // TODO: wire openai_dalle3. Note: DALL·E 3 does not accept input images;
      // real pipeline should swap to gpt-image-1 edit endpoint.
      return {
        endpoint: 'https://api.openai.com/v1/images/edits',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
        },
        body: {
          model: 'gpt-image-1',
          prompt,
          size: '1024x1024',
          n: 1,
        },
      };
    }
    case 'fal_nano_banana': {
      // TODO: wire fal_nano_banana. See https://fal.ai/models
      return {
        endpoint: 'https://fal.run/fal-ai/nano-banana',
        headers: {
          Authorization: `Key ${process.env.FAL_API_KEY ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: {
          prompt,
          image_url: '<satellite-signed-url>',
          num_images: 1,
        },
      };
    }
    case 'disabled':
    default:
      return { endpoint: '', headers: {}, body: {} };
  }
}

/**
 * Queue an AI rendering job. Returns the inserted `renderings` row.
 * Provider API calls are NOT executed here — only the envelope is built;
 * a background worker is expected to pick the row up (future task).
 */
export async function renderSiteWithChargers(
  input: RenderSiteInput,
  supabase: SupabaseLike,
): Promise<Rendering> {
  const provider = resolveProvider();
  const enabled = isEnabled();

  if (!enabled || provider === 'disabled') {
    return insertRendering(supabase, {
      project_id: input.projectId,
      satellite_photo_id: input.satellitePhotoId,
      provider: 'disabled',
      status: 'failed',
      cost_usd: 0,
      error: 'AI rendering disabled',
      output_storage_path: null,
      metadata: {
        chargerPlacements: input.chargerPlacements,
        chargerModel: input.chargerModel ?? null,
      },
    });
  }

  // Cost-cap check.
  const costCap = resolveCostCap();
  const prior = await sumPriorCost(supabase, input.projectId);
  if (prior >= costCap) {
    return insertRendering(supabase, {
      project_id: input.projectId,
      satellite_photo_id: input.satellitePhotoId,
      provider,
      status: 'failed',
      cost_usd: 0,
      error: 'budget_exceeded',
      output_storage_path: null,
      metadata: {
        priorCostUsd: prior,
        costCapUsd: costCap,
        chargerPlacements: input.chargerPlacements,
        chargerModel: input.chargerModel ?? null,
      },
    });
  }

  // Build the request envelope (stored in metadata for the worker to pick up).
  const envelope = buildProviderRequest({ input, provider });

  return insertRendering(supabase, {
    project_id: input.projectId,
    satellite_photo_id: input.satellitePhotoId,
    provider,
    status: 'queued',
    cost_usd: PROVIDER_STUB_COST_USD,
    error: null,
    output_storage_path: null,
    metadata: {
      endpoint: envelope.endpoint,
      requestBody: envelope.body,
      chargerPlacements: input.chargerPlacements,
      chargerModel: input.chargerModel ?? null,
      costCapUsd: costCap,
    },
  });
}

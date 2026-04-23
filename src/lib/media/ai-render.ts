/**
 * AI rendering: composites chargers onto the project's source site photo
 * using one of several configured image-generation providers.
 *
 * Schema reference (migration 20260418_005_media.sql, table `renderings`):
 *   status in ('queued', 'processing', 'complete', 'failed')
 *   columns: id, project_id, source_photo_id, requested_by, model_used,
 *            prompt, status, storage_path, error, cost_usd, metadata,
 *            created_at, updated_at
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

/** Matches the `renderings.status` check constraint. */
export type RenderStatus = 'queued' | 'processing' | 'complete' | 'failed';

export type RenderProvider =
  | 'gemini_2_5_flash_image'
  | 'openai_gpt_image'
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
  /** FK to `site_photos.id` — the base photo we're editing on top of. */
  sourcePhotoId: string;
  chargerPlacements: ChargerPlacement[];
  chargerModel?: string;
  /** FK to `profiles.id`; optional because public-share flows have no profile. */
  requestedBy?: string | null;
}

/** Shape returned by this module. Mirrors the `renderings` table row. */
export interface Rendering {
  id?: string;
  project_id: string;
  source_photo_id: string;
  requested_by: string | null;
  model_used: string | null;
  prompt: string | null;
  status: RenderStatus;
  storage_path: string | null;
  error: string | null;
  cost_usd: number;
  metadata: Record<string, unknown>;
  created_at?: string;
}

type SupabaseLike = SupabaseClient | { from: unknown };

const DEFAULT_COST_CAP_USD = 5;
const PROVIDER_STUB_COST_USD = 0.05; // deliberate, tiny, so tests are stable

/**
 * Canonical model IDs per provider. Centralized so when the upstream
 * catalog updates (e.g. OpenAI → gpt-image-2), we change one place.
 * Phase 5 will add a proper model-resolver with rollout controls.
 */
export const PROVIDER_MODEL_ID: Record<Exclude<RenderProvider, 'disabled'>, string> = {
  gemini_2_5_flash_image: 'gemini-2.5-flash-image',
  // As of 2026-04-22 OpenAI's catalog lists gpt-image-2 as current.
  openai_gpt_image: 'gpt-image-2',
  fal_nano_banana: 'fal-ai/nano-banana',
};

function isEnabled(): boolean {
  return (process.env.AI_RENDERING_ENABLED ?? 'false').toLowerCase() === 'true';
}

function resolveProvider(): RenderProvider {
  const raw = (process.env.AI_RENDER_PROVIDER ?? 'disabled').toLowerCase();
  if (
    raw === 'gemini_2_5_flash_image' ||
    raw === 'openai_gpt_image' ||
    raw === 'fal_nano_banana'
  ) {
    return raw;
  }
  // Legacy spelling: `openai_dalle3` used to mean "OpenAI image endpoint"
  // back when DALL·E 3 was current. It now resolves to gpt-image-2.
  if (raw === 'openai_dalle3') return 'openai_gpt_image';
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
  provider: Exclude<RenderProvider, 'disabled'>;
}

interface ProviderRequest {
  endpoint: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  prompt: string;
  model: string;
}

/**
 * Provider-specific request envelopes. Real API calls stay stubbed in
 * Phase 1 — Phase 5 wires live dispatch after legal clearance.
 */
function buildProviderRequest({ input, provider }: ProviderDispatchInput): ProviderRequest {
  const prompt = `Composite ${input.chargerPlacements.length} ${
    input.chargerModel ?? 'EV charger'
  } unit(s) onto the source image at the provided lat/lng positions. Keep ground-truth scale, shadows aligned to noon sun. Mark each with a subtle translucent blue pedestal.`;
  const model = PROVIDER_MODEL_ID[provider];

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
                { fileData: { mimeType: 'image/jpeg', fileUri: '<source-signed-url>' } },
              ],
            },
          ],
          generationConfig: { temperature: 0.4 },
        },
        prompt,
        model,
      };
    }
    case 'openai_gpt_image': {
      // TODO (Phase 5): wire live openai images.edit. Model resolves
      // centrally via PROVIDER_MODEL_ID so catalog updates are one-line.
      return {
        endpoint: 'https://api.openai.com/v1/images/edits',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
        },
        body: {
          model,
          prompt,
          size: '1024x1024',
          n: 1,
        },
        prompt,
        model,
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
          image_url: '<source-signed-url>',
          num_images: 1,
        },
        prompt,
        model,
      };
    }
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
  const requestedBy = input.requestedBy ?? null;

  if (!enabled || provider === 'disabled') {
    return insertRendering(supabase, {
      project_id: input.projectId,
      source_photo_id: input.sourcePhotoId,
      requested_by: requestedBy,
      model_used: null,
      prompt: null,
      status: 'failed',
      storage_path: null,
      error: 'AI rendering disabled',
      cost_usd: 0,
      metadata: {
        provider: 'disabled',
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
      source_photo_id: input.sourcePhotoId,
      requested_by: requestedBy,
      model_used: null,
      prompt: null,
      status: 'failed',
      storage_path: null,
      error: 'budget_exceeded',
      cost_usd: 0,
      metadata: {
        provider,
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
    source_photo_id: input.sourcePhotoId,
    requested_by: requestedBy,
    model_used: envelope.model,
    prompt: envelope.prompt,
    status: 'queued',
    storage_path: null,
    error: null,
    cost_usd: PROVIDER_STUB_COST_USD,
    metadata: {
      provider,
      endpoint: envelope.endpoint,
      requestBody: envelope.body,
      chargerPlacements: input.chargerPlacements,
      chargerModel: input.chargerModel ?? null,
      costCapUsd: costCap,
    },
  });
}

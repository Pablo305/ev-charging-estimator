import type { EstimateOutput } from './types';

export type SharedEstimateStatus = 'draft' | 'public' | 'revoked';

/**
 * Preview imagery for PDF + shared page.
 *
 * Phase 1 compliance change: new shares persist ONLY `siteCoordinates`.
 * The URL fields remain optional on the type for two reasons:
 *   1. Backwards compatibility with legacy `shared_estimates` records
 *      created before Phase 1 that still carry embedded URLs.
 *   2. The in-session PDF export path (see `exportEstimatePDFWithPreviews`)
 *      may still build URLs on demand without persisting them.
 *
 * When rendering, prefer `resolveDisplayPreviewUrls` over reading these
 * URL fields directly — it reconstructs them from coordinates when the
 * record is a new (coords-only) share.
 */
export interface SharedPreviewAssets {
  /** @deprecated URL-bearing legacy shape. Do not write from new code. */
  satelliteStaticUrl?: string;
  /** @deprecated URL-bearing legacy shape. Do not write from new code. */
  streetViewStaticUrl?: string;
  /** Geocoded [lng, lat] — persistence-safe, used to rebuild URLs at display time. */
  siteCoordinates?: [number, number];
}

export interface SharedEstimateRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: SharedEstimateStatus;
  output: EstimateOutput;
  previewAssets?: SharedPreviewAssets;
}

// ============================================================
// Static map / Street View preview URLs for estimates & PDFs
//
// Key-handling rules (Phase 1 blocker):
//
// 1. URLs produced by these builders embed an API key in query params.
//    Once a URL is in DOM (server-rendered HTML) or passed as a Client
//    Component prop, its key is exposed to the browser.
// 2. Therefore every builder in this file uses ONLY `NEXT_PUBLIC_*`
//    keys — which are intended to be browser-visible and should be
//    referrer-restricted in the Google Cloud / Mapbox console.
//    `GOOGLE_MAPS_SERVER_KEY` must never be concatenated into a URL
//    that could reach the client. If a future caller needs a true
//    server-only Google request (e.g. server-side image proxy),
//    build that URL inline in the server route and do not reuse
//    these functions.
// 3. Persisting any of these URLs into public records is separately
//    forbidden — they leak keys to anyone with the share URL AND
//    violate Google's no-cache terms for Static / Street View images.
//    Use `buildShareCoordinatesFromOutput` for persistence; use these
//    builders (or `resolveDisplayPreviewUrls`) only at display time.
// ============================================================

import type { SharedPreviewAssets } from '@/lib/estimate/shared-types';
import type { EstimateOutput } from '@/lib/estimate/types';

// Satellite (Mapbox) accepts arbitrary widths up to 1280x1280 @2x.
const SATELLITE_W = 800;
const SATELLITE_H = 600;
// Google Street View Static API caps images at 640x640 per the official
// usage guide: https://developers.google.com/maps/documentation/streetview/usage-and-billing
// Requesting 800x600 returns a 400. Use 640x640 and let the CSS fit it.
const STREET_VIEW_W = 640;
const STREET_VIEW_H = 640;

/** Mapbox Satellite static image (requires NEXT_PUBLIC_MAPBOX_TOKEN). */
export function buildSatelliteStaticUrl(lng: number, lat: number): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},18,0/${SATELLITE_W}x${SATELLITE_H}@2x?access_token=${encodeURIComponent(token)}`;
}

/**
 * Google Street View Static URL using the public (browser-visible) key.
 *
 * Deliberately DOES NOT read `GOOGLE_MAPS_SERVER_KEY`. This function's
 * output is embedded in `<img src>` or Client Component props, both of
 * which are shipped to the browser — so the key in the URL has to be
 * safe for the browser to see. Use `NEXT_PUBLIC_GOOGLE_MAPS_KEY` with
 * referrer restrictions configured in the Google Cloud console.
 *
 * Returns `null` when the public key is not set; callers decide whether
 * to suppress the preview or fall back to something else.
 */
export function buildStreetViewStaticUrl(lat: number, lng: number): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/streetview?size=${STREET_VIEW_W}x${STREET_VIEW_H}&location=${lat},${lng}&fov=90&pitch=0&heading=0&key=${encodeURIComponent(key)}`;
}

/**
 * Persistence-safe: returns only the site coordinates. No URLs.
 * Safe to stash into the public share payload. Callers that need to
 * display an image must call `resolveDisplayPreviewUrls` at render time.
 */
export function buildShareCoordinatesFromOutput(
  output: EstimateOutput,
): SharedPreviewAssets {
  const coords = output.input.mapWorkspace?.siteCoordinates;
  if (!coords) return {};
  return { siteCoordinates: coords };
}

/**
 * Render-time URL resolver. Given a `SharedPreviewAssets` (which for new
 * shares carries only `siteCoordinates`), returns fresh Mapbox / Google
 * Street View static URLs built from coordinates. Safe to call on the
 * client — only `NEXT_PUBLIC_*` env vars are read when running in the
 * browser. When the input already has URLs (legacy records created
 * before Phase 1 closed the key-leak path), those are preferred as-is.
 */
export function resolveDisplayPreviewUrls(
  previewAssets?: SharedPreviewAssets,
): { satelliteStaticUrl?: string; streetViewStaticUrl?: string } {
  if (!previewAssets) return {};
  const out: { satelliteStaticUrl?: string; streetViewStaticUrl?: string } = {
    satelliteStaticUrl: previewAssets.satelliteStaticUrl,
    streetViewStaticUrl: previewAssets.streetViewStaticUrl,
  };
  if (previewAssets.siteCoordinates) {
    const [lng, lat] = previewAssets.siteCoordinates;
    if (!out.satelliteStaticUrl) {
      const sat = buildSatelliteStaticUrl(lng, lat);
      if (sat) out.satelliteStaticUrl = sat;
    }
    if (!out.streetViewStaticUrl) {
      const sv = buildStreetViewStaticUrl(lat, lng);
      if (sv) out.streetViewStaticUrl = sv;
    }
  }
  return out;
}

/**
 * @deprecated Produces URLs that leak API keys if persisted into public
 * records. Use `buildShareCoordinatesFromOutput` for persistence; use
 * the URL builders at display time. Retained only for on-demand server
 * rendering paths (e.g. PDF generation in the same request that serves
 * the response). Will be removed in Phase 8.
 */
export function buildPreviewAssetsFromOutput(output: EstimateOutput): SharedPreviewAssets {
  const coords = output.input.mapWorkspace?.siteCoordinates;
  if (!coords) return {};
  const [lng, lat] = coords;
  return {
    siteCoordinates: coords,
    satelliteStaticUrl: buildSatelliteStaticUrl(lng, lat) ?? undefined,
    streetViewStaticUrl: buildStreetViewStaticUrl(lat, lng) ?? undefined,
  };
}

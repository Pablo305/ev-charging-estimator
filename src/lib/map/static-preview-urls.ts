// ============================================================
// Static map / Street View preview URLs for estimates & PDFs
// ============================================================

import type { SharedPreviewAssets } from '@/lib/estimate/shared-types';
import type { EstimateOutput } from '@/lib/estimate/types';

const MAP_W = 800;
const MAP_H = 600;

/** Mapbox Satellite static image (requires NEXT_PUBLIC_MAPBOX_TOKEN). */
export function buildSatelliteStaticUrl(lng: number, lat: number): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},18,0/${MAP_W}x${MAP_H}@2x?access_token=${encodeURIComponent(token)}`;
}

/** Google Street View Static (uses public browser key; server may use same). */
export function buildStreetViewStaticUrl(lat: number, lng: number): string | null {
  const key =
    process.env.GOOGLE_MAPS_SERVER_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/streetview?size=${MAP_W}x${MAP_H}&location=${lat},${lng}&fov=90&pitch=0&heading=0&key=${encodeURIComponent(key)}`;
}

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

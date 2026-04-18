/**
 * Google Street View Static + Maps Static URL builders for
 * automatic site-media capture. Pure functions only — no React.
 *
 * Key resolution order (server-side):
 *   1. process.env.GOOGLE_MAPS_SERVER_KEY (preferred — never shipped to browser)
 *   2. process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY (fallback — same key we already
 *      use for the interactive <StreetViewPanel>; available client- & server-side)
 *
 * The fallback exists because the first version of StreetViewPanel.tsx was
 * shipped with only the public key; the server-key is introduced here so
 * higher-volume automated capture doesn't leak request quota into browser
 * referer-restricted usage. Either will work for Static API calls.
 */

export const STREET_VIEW_SIZE = '640x640';
export const SATELLITE_SIZE = '1280x1280';
export const SATELLITE_ZOOM = 20;
export const DEFAULT_FOV = 90;

const STREET_VIEW_ENDPOINT = 'https://maps.googleapis.com/maps/api/streetview';
const SATELLITE_ENDPOINT = 'https://maps.googleapis.com/maps/api/staticmap';

export interface StreetViewParams {
  lat: number;
  lng: number;
  heading: number;
  pitch?: number;
  fov?: number;
  size?: string;
}

export interface SatelliteParams {
  lat: number;
  lng: number;
  zoom?: number;
  size?: string;
}

/** Resolve the Google Maps API key for static-API calls. See header comment. */
export function resolveGoogleMapsKey(): string | null {
  const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (serverKey && serverKey.length > 0) return serverKey;
  const publicKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (publicKey && publicKey.length > 0) return publicKey;
  return null;
}

/** Builds a Street View Static API URL. Missing key => empty `key=` param. */
export function getStreetViewStaticUrl(params: StreetViewParams): string {
  const {
    lat,
    lng,
    heading,
    pitch = 0,
    fov = DEFAULT_FOV,
    size = STREET_VIEW_SIZE,
  } = params;
  const key = resolveGoogleMapsKey() ?? '';
  const q = new URLSearchParams({
    size,
    location: `${lat},${lng}`,
    heading: String(heading),
    pitch: String(pitch),
    fov: String(fov),
    key,
  });
  return `${STREET_VIEW_ENDPOINT}?${q.toString()}`;
}

/** Builds a Google Maps Static API URL, satellite maptype. */
export function getSatelliteStaticUrl(params: SatelliteParams): string {
  const {
    lat,
    lng,
    zoom = SATELLITE_ZOOM,
    size = SATELLITE_SIZE,
  } = params;
  const key = resolveGoogleMapsKey() ?? '';
  const q = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size,
    maptype: 'satellite',
    scale: '2',
    key,
  });
  return `${SATELLITE_ENDPOINT}?${q.toString()}`;
}

/**
 * 8-direction capture: N / NE / E / SE / S / SW / W / NW at pitch 0.
 * Used as the default coverage around any POI (site center or charger).
 */
export function defaultCaptureAngles(): Array<{ heading: number; pitch: number }> {
  return [0, 45, 90, 135, 180, 225, 270, 315].map((heading) => ({
    heading,
    pitch: 0,
  }));
}

/**
 * 4-direction capture: cardinal only (N/E/S/W). Used for per-charger captures
 * where 8 would be overkill for what are usually small parking-lot zones.
 */
export function cardinalCaptureAngles(): Array<{ heading: number; pitch: number }> {
  return [0, 90, 180, 270].map((heading) => ({ heading, pitch: 0 }));
}

/**
 * Deterministic SHA-256 hash of (lat, lng, heading, pitch). Used as the
 * bucket-object name so repeated captures for the same POI deduplicate.
 *
 * Uses Web Crypto where available (browser + Node 20+), falling back to
 * node:crypto on older Node runtimes.
 */
export async function captureHash(
  lat: number,
  lng: number,
  heading: number,
  pitch: number,
): Promise<string> {
  const input = `${lat.toFixed(6)}|${lng.toFixed(6)}|${heading}|${pitch}`;
  const maybeSubtle =
    typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle
      ? globalThis.crypto.subtle
      : null;

  if (maybeSubtle) {
    const enc = new TextEncoder().encode(input);
    const buf = await maybeSubtle.digest('SHA-256', enc);
    return bufferToHex(buf);
  }

  // Node fallback. Using dynamic import keeps this module bundler-safe.
  const nodeCrypto = await import('node:crypto');
  return nodeCrypto.createHash('sha256').update(input).digest('hex');
}

function bufferToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

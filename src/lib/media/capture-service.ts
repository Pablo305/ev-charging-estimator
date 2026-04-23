/**
 * Orchestrates automated capture of imagery for a project site.
 *
 * Schema reference (migration 20260418_005_media.sql, table `site_photos`):
 *   kind in ('street_view', 'satellite', 'uploaded', 'annotated')
 *   columns: id, project_id, uploaded_by, kind, heading, pitch, fov,
 *            location_label, latitude, longitude, storage_path,
 *            mime_type, width, height, metadata, created_at, updated_at
 *
 * Compliance gate (Phase 1 blocker): persisting raw bytes fetched from
 * Google Street View Static / Maps Static is restricted by Google's terms.
 * Until legal review is complete, this flow is disabled by default. Set
 * `SITE_PHOTO_CAPTURE_ENABLED=true` *only* after clearance is documented.
 * When disabled, `captureProjectMedia` returns an empty result + a single
 * 'capture disabled' error so callers see why nothing happened.
 *
 * Dedup: the per-capture SHA-256 hash is stored in `metadata.capture_hash`.
 * A prior row with the same hash under the same project is reused. (There
 * is no `capture_hash` *column* in the schema — it's intentionally in
 * metadata so adding dedup didn't require a migration.)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  captureHash,
  cardinalCaptureAngles,
  defaultCaptureAngles,
  getSatelliteStaticUrl,
  getStreetViewStaticUrl,
  SATELLITE_SIZE,
  STREET_VIEW_SIZE,
  DEFAULT_FOV,
} from './street-view';

export const SITE_PHOTOS_BUCKET = 'site-photos';

/** Matches the `site_photos.kind` check constraint. */
export type SitePhotoKind = 'street_view' | 'satellite' | 'uploaded' | 'annotated';

/** Location label distinguishes `site_center` vs a specific charger id. */
export const SITE_CENTER_LABEL = 'site_center';

export interface SitePhoto {
  id?: string;
  project_id: string;
  kind: SitePhotoKind;
  heading: number | null;
  pitch: number | null;
  fov: number | null;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  storage_path: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  metadata: Record<string, unknown>;
  created_at?: string;
}

export interface ChargerInput {
  id: string;
  lat: number;
  lng: number;
}

export interface CaptureProjectMediaInput {
  projectId: string;
  centerLat: number;
  centerLng: number;
  chargers: ChargerInput[];
}

export interface CaptureProjectMediaResult {
  centerPhotos: SitePhoto[];
  chargerPhotos: Record<string, SitePhoto[]>;
  satellite: SitePhoto | null;
  errors: string[];
}

interface FetchAndUploadInput {
  url: string;
  projectId: string;
  hash: string;
  contentType: string;
}

interface FetchLike {
  (input: string, init?: RequestInit): Promise<Response>;
}

type SupabaseLike = SupabaseClient | { storage: unknown; from: unknown };

/**
 * Is Google imagery persistence cleared for this environment? Defaults false
 * so the gate fails closed even if the env var is unset.
 */
export function isSitePhotoCaptureEnabled(): boolean {
  return (process.env.SITE_PHOTO_CAPTURE_ENABLED ?? 'false').toLowerCase() === 'true';
}

/**
 * Upload an image to the `site-photos` bucket following the RLS convention
 * from migration 20260418_008_storage_buckets.sql (line 8):
 *
 *   site-photos/<project_id>/<filename>
 *
 * The first path segment *inside* the bucket must be the project UUID so
 * `(storage.foldername(name))[1]` in the RLS policy resolves to a real
 * project id. We return both the in-bucket path (for the upload call)
 * and the bucket-prefixed path (for the DB column, which is what
 * `fetchEstimate.inferBucketFromPath` later parses to derive the bucket).
 */
async function uploadToStorage(
  supabase: SupabaseLike,
  input: FetchAndUploadInput,
  fetchImpl: FetchLike,
): Promise<{ storagePath: string } | { error: string }> {
  try {
    const res = await fetchImpl(input.url);
    if (!res.ok) {
      return { error: `fetch ${res.status}` };
    }
    const buf = await res.arrayBuffer();
    const inBucketPath = `${input.projectId}/${input.hash}.jpg`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = (supabase as any).storage.from(SITE_PHOTOS_BUCKET);
    const upload = await storage.upload(inBucketPath, buf, {
      contentType: input.contentType,
      upsert: true,
    });
    if (upload.error) {
      return { error: `upload: ${upload.error.message ?? 'unknown'}` };
    }
    // Persist the bucket-prefixed path so downstream `inferBucketFromPath`
    // (src/lib/proposal/fetchEstimate.ts) can split the bucket back out.
    return { storagePath: `${SITE_PHOTOS_BUCKET}/${inBucketPath}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return { error: `fetch/upload threw: ${msg}` };
  }
}

async function findExistingPhoto(
  supabase: SupabaseLike,
  projectId: string,
  hash: string,
): Promise<SitePhoto | null> {
  // Hash lives in metadata (no dedicated column). Supabase supports
  // `metadata->>capture_hash` as a JSON text operator.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = (supabase as any)
    .from('site_photos')
    .select('*')
    .eq('project_id', projectId)
    .eq('metadata->>capture_hash', hash)
    .maybeSingle();
  const { data, error } = await query;
  if (error || !data) return null;
  return data as SitePhoto;
}

async function insertPhoto(
  supabase: SupabaseLike,
  row: Omit<SitePhoto, 'id' | 'created_at'>,
): Promise<{ photo?: SitePhoto; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('site_photos')
    .insert(row)
    .select('*')
    .single();
  if (error) return { error: error.message ?? 'insert failed' };
  return { photo: data as SitePhoto };
}

function parseSize(size: string): { width: number; height: number } {
  const [w, h] = size.split('x').map((n) => Number.parseInt(n, 10));
  return {
    width: Number.isFinite(w) ? w : 640,
    height: Number.isFinite(h) ? h : 640,
  };
}

interface CaptureOneInput {
  supabase: SupabaseLike;
  projectId: string;
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  fov: number;
  kind: SitePhotoKind;
  locationLabel: string;
  url: string;
  size: string;
  metadata: Record<string, unknown>;
  fetchImpl: FetchLike;
}

async function captureOne(input: CaptureOneInput): Promise<SitePhoto | { error: string }> {
  const hash = await captureHash(input.lat, input.lng, input.heading, input.pitch);

  const existing = await findExistingPhoto(input.supabase, input.projectId, hash);
  if (existing) return existing;

  const uploaded = await uploadToStorage(
    input.supabase,
    {
      url: input.url,
      projectId: input.projectId,
      hash,
      contentType: 'image/jpeg',
    },
    input.fetchImpl,
  );
  if ('error' in uploaded) return { error: uploaded.error };

  const { width, height } = parseSize(input.size);

  const inserted = await insertPhoto(input.supabase, {
    project_id: input.projectId,
    kind: input.kind,
    heading: input.heading,
    pitch: input.pitch,
    fov: input.fov,
    location_label: input.locationLabel,
    latitude: input.lat,
    longitude: input.lng,
    storage_path: uploaded.storagePath,
    mime_type: 'image/jpeg',
    width,
    height,
    metadata: { ...input.metadata, capture_hash: hash },
  });
  if (inserted.error || !inserted.photo) {
    return { error: inserted.error ?? 'insert returned no row' };
  }
  return inserted.photo;
}

/**
 * Capture all media for a project.
 *
 * GATED: returns early with an 'capture disabled' error when
 * `SITE_PHOTO_CAPTURE_ENABLED` is not `'true'`. When enabled, safe to call
 * repeatedly — dedupes via metadata.capture_hash. One bad fetch does not
 * abort the whole run.
 */
export async function captureProjectMedia(
  input: CaptureProjectMediaInput,
  supabase: SupabaseLike,
  opts: { fetchImpl?: FetchLike } = {},
): Promise<CaptureProjectMediaResult> {
  if (!isSitePhotoCaptureEnabled()) {
    return {
      centerPhotos: [],
      chargerPhotos: {},
      satellite: null,
      errors: [
        'capture disabled: SITE_PHOTO_CAPTURE_ENABLED is not true ' +
          '(Google imagery persistence is pending legal review; see migration ' +
          '20260418_005_media.sql and capture-service.ts header).',
      ],
    };
  }

  const fetchImpl = opts.fetchImpl ?? ((url, init) => fetch(url, init));
  const errors: string[] = [];
  const centerPhotos: SitePhoto[] = [];
  const chargerPhotos: Record<string, SitePhoto[]> = {};
  let satellite: SitePhoto | null = null;

  // 1. Street View, 8 angles around center.
  for (const angle of defaultCaptureAngles()) {
    const url = getStreetViewStaticUrl({
      lat: input.centerLat,
      lng: input.centerLng,
      heading: angle.heading,
      pitch: angle.pitch,
      size: STREET_VIEW_SIZE,
    });
    const result = await captureOne({
      supabase,
      projectId: input.projectId,
      lat: input.centerLat,
      lng: input.centerLng,
      heading: angle.heading,
      pitch: angle.pitch,
      fov: DEFAULT_FOV,
      kind: 'street_view',
      locationLabel: SITE_CENTER_LABEL,
      url,
      size: STREET_VIEW_SIZE,
      metadata: { size: STREET_VIEW_SIZE, fov: DEFAULT_FOV, role: 'center' },
      fetchImpl,
    });
    if ('error' in result) {
      errors.push(`center@${angle.heading}: ${result.error}`);
    } else {
      centerPhotos.push(result);
    }
  }

  // 2. Satellite snapshot (single). pitch=90 reserved for overhead to
  // produce a unique hash vs same-lat/lng street view captures.
  try {
    const satUrl = getSatelliteStaticUrl({
      lat: input.centerLat,
      lng: input.centerLng,
    });
    const satResult = await captureOne({
      supabase,
      projectId: input.projectId,
      lat: input.centerLat,
      lng: input.centerLng,
      heading: 0,
      pitch: 90,
      fov: 0,
      kind: 'satellite',
      locationLabel: SITE_CENTER_LABEL,
      url: satUrl,
      size: SATELLITE_SIZE,
      metadata: { size: SATELLITE_SIZE, zoom: 20, maptype: 'satellite' },
      fetchImpl,
    });
    if ('error' in satResult) {
      errors.push(`satellite: ${satResult.error}`);
    } else {
      satellite = satResult;
    }
  } catch (err: unknown) {
    errors.push(`satellite threw: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  // 3. Street View, 4 cardinals per charger.
  for (const charger of input.chargers) {
    chargerPhotos[charger.id] = [];
    for (const angle of cardinalCaptureAngles()) {
      const url = getStreetViewStaticUrl({
        lat: charger.lat,
        lng: charger.lng,
        heading: angle.heading,
        pitch: angle.pitch,
      });
      const result = await captureOne({
        supabase,
        projectId: input.projectId,
        lat: charger.lat,
        lng: charger.lng,
        heading: angle.heading,
        pitch: angle.pitch,
        fov: DEFAULT_FOV,
        kind: 'street_view',
        locationLabel: charger.id,
        url,
        size: STREET_VIEW_SIZE,
        metadata: {
          chargerId: charger.id,
          size: STREET_VIEW_SIZE,
          fov: DEFAULT_FOV,
          role: 'charger',
        },
        fetchImpl,
      });
      if ('error' in result) {
        errors.push(`${charger.id}@${angle.heading}: ${result.error}`);
      } else {
        chargerPhotos[charger.id].push(result);
      }
    }
  }

  return { centerPhotos, chargerPhotos, satellite, errors };
}

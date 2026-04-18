/**
 * Orchestrates automated capture of Street View + Satellite imagery for
 * a project. Writes objects into the `site-photos` Supabase storage bucket
 * and records rows in the `site_photos` table.
 *
 * The schema is defined by a sibling migration (`site_photos` table with
 * columns: id uuid pk, project_id uuid, kind text, heading int, pitch int,
 * location_label text, storage_path text, capture_hash text,
 * metadata jsonb, created_at timestamptz).
 *
 * Idempotent: a row with the same (project_id, capture_hash) is reused,
 * so repeated calls with the same inputs won't duplicate storage or DB rows.
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
} from './street-view';

export const SITE_PHOTOS_BUCKET = 'site-photos';

export type SitePhotoKind = 'streetview_center' | 'streetview_charger' | 'satellite';

export interface SitePhoto {
  id?: string;
  project_id: string;
  kind: SitePhotoKind;
  heading: number;
  pitch: number;
  location_label: string;
  storage_path: string;
  capture_hash: string;
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

/** Minimal surface of the Supabase admin client that we actually exercise.
 *  Typed as `unknown` so both real + mocked clients pass without generics pain. */
type SupabaseLike = SupabaseClient | { storage: unknown; from: unknown };

/** Internal: upload the blob to storage (upsert=false, but dedup handled via
 *  capture_hash check before calling this). */
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
    const storagePath = `projects/${input.projectId}/${input.hash}.jpg`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = (supabase as any).storage.from(SITE_PHOTOS_BUCKET);
    const upload = await storage.upload(storagePath, buf, {
      contentType: input.contentType,
      upsert: true,
    });
    if (upload.error) {
      return { error: `upload: ${upload.error.message ?? 'unknown'}` };
    }
    return { storagePath };
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = (supabase as any)
    .from('site_photos')
    .select('*')
    .eq('project_id', projectId)
    .eq('capture_hash', hash)
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

interface CaptureOneInput {
  supabase: SupabaseLike;
  projectId: string;
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  kind: SitePhotoKind;
  locationLabel: string;
  url: string;
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

  const inserted = await insertPhoto(input.supabase, {
    project_id: input.projectId,
    kind: input.kind,
    heading: input.heading,
    pitch: input.pitch,
    location_label: input.locationLabel,
    storage_path: uploaded.storagePath,
    capture_hash: hash,
    metadata: input.metadata,
  });
  if (inserted.error || !inserted.photo) {
    return { error: inserted.error ?? 'insert returned no row' };
  }
  return inserted.photo;
}

/**
 * Capture all media for a project. Safe to call repeatedly — dedupes via
 * capture_hash. One bad fetch does not abort the whole run.
 */
export async function captureProjectMedia(
  input: CaptureProjectMediaInput,
  supabase: SupabaseLike,
  opts: { fetchImpl?: FetchLike } = {},
): Promise<CaptureProjectMediaResult> {
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
      kind: 'streetview_center',
      locationLabel: 'site_center',
      url,
      metadata: { size: STREET_VIEW_SIZE, fov: 90 },
      fetchImpl,
    });
    if ('error' in result) {
      errors.push(`center@${angle.heading}: ${result.error}`);
    } else {
      centerPhotos.push(result);
    }
  }

  // 2. Satellite snapshot (single).
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
      pitch: 90, // pitch=90 reserved for satellite (overhead) to get a unique hash
      kind: 'satellite',
      locationLabel: 'site_center',
      url: satUrl,
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
        kind: 'streetview_charger',
        locationLabel: charger.id,
        url,
        metadata: { chargerId: charger.id, size: STREET_VIEW_SIZE },
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

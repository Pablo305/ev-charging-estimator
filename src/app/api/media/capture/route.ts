import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { captureProjectMedia } from '@/lib/media/capture-service';
import { isAuthenticated } from '@/lib/auth/session';

interface ChargerBody {
  id: string;
  lat: number;
  lng: number;
}

interface CaptureBody {
  projectId: string;
  centerLat: number;
  centerLng: number;
  chargers: ChargerBody[];
}

function validateBody(raw: unknown): CaptureBody | string {
  if (typeof raw !== 'object' || raw === null) return 'body must be an object';
  const b = raw as Record<string, unknown>;
  if (typeof b.projectId !== 'string' || b.projectId.length === 0) {
    return 'projectId required';
  }
  if (typeof b.centerLat !== 'number' || !Number.isFinite(b.centerLat)) {
    return 'centerLat required';
  }
  if (typeof b.centerLng !== 'number' || !Number.isFinite(b.centerLng)) {
    return 'centerLng required';
  }
  if (!Array.isArray(b.chargers)) return 'chargers required';
  const chargers: ChargerBody[] = [];
  for (const c of b.chargers) {
    if (
      typeof c !== 'object' ||
      c === null ||
      typeof (c as Record<string, unknown>).id !== 'string' ||
      typeof (c as Record<string, unknown>).lat !== 'number' ||
      typeof (c as Record<string, unknown>).lng !== 'number'
    ) {
      return 'invalid charger entry';
    }
    const ci = c as ChargerBody;
    chargers.push({ id: ci.id, lat: ci.lat, lng: ci.lng });
  }
  return {
    projectId: b.projectId,
    centerLat: b.centerLat,
    centerLng: b.centerLng,
    chargers,
  };
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 500 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = validateBody(raw);
  if (typeof parsed === 'string') {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  try {
    const result = await captureProjectMedia(parsed, supabaseAdmin);
    return NextResponse.json({
      success: true,
      result: {
        centerPhotoCount: result.centerPhotos.length,
        chargerPhotoCounts: Object.fromEntries(
          Object.entries(result.chargerPhotos).map(([k, v]) => [k, v.length]),
        ),
        satellite: result.satellite,
        errors: result.errors,
        centerPhotos: result.centerPhotos,
        chargerPhotos: result.chargerPhotos,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ error: `capture failed: ${msg}` }, { status: 500 });
  }
}

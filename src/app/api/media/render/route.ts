import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { renderSiteWithChargers, type ChargerPlacement } from '@/lib/media/ai-render';
import { isAuthenticated } from '@/lib/auth/session';

interface RenderBody {
  projectId: string;
  sourcePhotoId: string;
  chargerPlacements: ChargerPlacement[];
  chargerModel?: string;
}

function validateBody(raw: unknown): RenderBody | string {
  if (typeof raw !== 'object' || raw === null) return 'body must be an object';
  const b = raw as Record<string, unknown>;
  if (typeof b.projectId !== 'string' || b.projectId.length === 0) {
    return 'projectId required';
  }
  if (typeof b.sourcePhotoId !== 'string' || b.sourcePhotoId.length === 0) {
    return 'sourcePhotoId required';
  }
  if (!Array.isArray(b.chargerPlacements)) return 'chargerPlacements required';

  const placements: ChargerPlacement[] = [];
  for (const c of b.chargerPlacements) {
    if (typeof c !== 'object' || c === null) return 'invalid charger placement';
    const cr = c as Record<string, unknown>;
    if (
      typeof cr.id !== 'string' ||
      typeof cr.lat !== 'number' ||
      typeof cr.lng !== 'number'
    ) {
      return 'invalid charger placement';
    }
    placements.push({
      id: cr.id,
      lat: cr.lat,
      lng: cr.lng,
      x_pct: typeof cr.x_pct === 'number' ? cr.x_pct : undefined,
      y_pct: typeof cr.y_pct === 'number' ? cr.y_pct : undefined,
    });
  }

  return {
    projectId: b.projectId,
    sourcePhotoId: b.sourcePhotoId,
    chargerPlacements: placements,
    chargerModel: typeof b.chargerModel === 'string' ? b.chargerModel : undefined,
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
    const rendering = await renderSiteWithChargers(parsed, supabaseAdmin);
    return NextResponse.json({ success: true, rendering });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ error: `render failed: ${msg}` }, { status: 500 });
  }
}

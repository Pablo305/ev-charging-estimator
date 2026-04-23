/**
 * GET /api/health
 *
 * Public response: `{ ok: true }`. Nothing else — liveness only.
 *
 * Authenticated response (valid session cookie): the detailed integration
 * status a developer needs to debug missing-credential issues.
 *
 * Before Phase 2.5.6 the public response advertised which paid
 * integrations (openai/gemini/monday/mapbox/googleMaps/supabase) were
 * configured. That's free recon for anyone probing the surface.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth/session';
import { isOpenAIAvailable } from '@/lib/ai/openai-client';
import { isGeminiAvailable } from '@/lib/ai/gemini-client';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ ok: true });
  }

  const openai = isOpenAIAvailable();
  const gemini = isGeminiAvailable();
  const monday = !!process.env.MONDAY_API_TOKEN;
  const mapbox = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapWorkspace = process.env.NEXT_PUBLIC_MAP_WORKSPACE === 'true';
  const googleMaps = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const supabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const aiReady = openai || gemini;

  return NextResponse.json({
    status: 'ok',
    service: 'BulletEV Estimate Generator',
    version: '0.1.0-prototype',
    timestamp: new Date().toISOString(),
    services: {
      openai,
      gemini,
      monday,
      mapbox,
      mapWorkspace,
      googleMaps,
      supabase,
      aiReady,
    },
  });
}

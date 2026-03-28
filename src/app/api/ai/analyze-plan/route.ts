import { NextResponse } from 'next/server';
import { isGeminiAvailable, analyzeImage } from '@/lib/ai/gemini-client';
import { buildPlanAnalysisPrompt } from '@/lib/ai/prompts';
import type { PlanAnalysisResponse } from '@/lib/ai/plan-analysis-types';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
  if (!isGeminiAvailable()) {
    return NextResponse.json(
      { error: 'Gemini API key not configured. Set GEMINI_API_KEY environment variable.' },
      { status: 501 },
    );
  }

  try {
    const { imageBase64, mimeType } = await request.json();

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: 'imageBase64 and mimeType required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported image type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    const sizeBytes = Math.ceil(imageBase64.length * 0.75);
    if (sizeBytes > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image too large. Maximum 10MB.' }, { status: 400 });
    }

    const prompt = buildPlanAnalysisPrompt();
    const raw = await analyzeImage(imageBase64, mimeType, prompt);
    let parsed: PlanAnalysisResponse;
    try {
      parsed = JSON.parse(raw) as PlanAnalysisResponse;
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON. Please try again.' }, { status: 502 });
    }

    if (!parsed.runs) parsed.runs = [];
    if (!parsed.equipment) parsed.equipment = [];

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('Analyze plan error:', err);
    return NextResponse.json({ error: 'Plan analysis service temporarily unavailable' }, { status: 502 });
  }
}

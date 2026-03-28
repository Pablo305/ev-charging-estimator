import { NextResponse } from 'next/server';
import { isOpenAIAvailable, visionCompletion, VisionFile } from '@/lib/ai/openai-client';
import { isGeminiAvailable, analyzeImage } from '@/lib/ai/gemini-client';
import { buildPhotoAnalysisPrompt } from '@/lib/ai/prompts';
import type { PhotoAnalysisResponse, AnalysisFile } from '@/lib/ai/types';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB per file
const MAX_FILES = 10;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

function validateFile(
  f: unknown,
  index: number,
): { ok: true; file: AnalysisFile } | { ok: false; error: string } {
  if (!f || typeof f !== 'object') {
    return { ok: false, error: `File at index ${index} is invalid` };
  }
  const r = f as Record<string, unknown>;
  const base64 = typeof r.base64 === 'string' ? r.base64 : '';
  const mimeType = typeof r.mimeType === 'string' ? r.mimeType : '';
  const fileName = typeof r.fileName === 'string' ? r.fileName : `file-${index + 1}`;

  if (!base64) return { ok: false, error: `File "${fileName}" has no data` };
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return { ok: false, error: `File "${fileName}" has unsupported type "${mimeType}". Allowed: ${ALLOWED_TYPES.join(', ')}` };
  }
  const sizeBytes = Math.ceil(base64.length * 0.75);
  if (sizeBytes > MAX_FILE_SIZE) {
    return { ok: false, error: `File "${fileName}" exceeds 20 MB limit` };
  }
  return { ok: true, file: { base64, mimeType, fileName } };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support both legacy single-image and new multi-file format
    let files: AnalysisFile[];

    if (Array.isArray(body.files)) {
      if (body.files.length === 0) {
        return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
      }
      if (body.files.length > MAX_FILES) {
        return NextResponse.json({ error: `Maximum ${MAX_FILES} files per request` }, { status: 400 });
      }
      const validated: AnalysisFile[] = [];
      for (let i = 0; i < body.files.length; i++) {
        const result = validateFile(body.files[i], i);
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        validated.push(result.file);
      }
      files = validated;
    } else if (body.imageBase64 && body.mimeType) {
      files = [{ base64: body.imageBase64, mimeType: body.mimeType, fileName: 'photo' }];
    } else {
      return NextResponse.json(
        { error: 'Provide either { files: [...] } or { imageBase64, mimeType }' },
        { status: 400 },
      );
    }

    const prompt = buildPhotoAnalysisPrompt(files.length);

    // Prefer OpenAI GPT-5.4 for vision; fall back to Gemini for single images
    let raw: string;

    if (isOpenAIAvailable()) {
      const visionFiles: VisionFile[] = files.map((f) => ({
        base64: f.base64,
        mimeType: f.mimeType,
      }));
      raw = await visionCompletion(
        'You are an expert EV charging infrastructure site assessor. Return ONLY valid JSON.',
        prompt,
        visionFiles,
        { jsonMode: true, temperature: 0.15 },
      );
    } else if (isGeminiAvailable() && files.length === 1) {
      raw = await analyzeImage(files[0].base64, files[0].mimeType, prompt);
    } else {
      return NextResponse.json(
        {
          error: isGeminiAvailable()
            ? 'Multi-file analysis requires OpenAI API key (GPT-5.4). Set OPENAI_API_KEY.'
            : 'No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY.',
        },
        { status: 501 },
      );
    }

    let parsed: PhotoAnalysisResponse;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid response. Please try again.' },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('Analyze photo error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('timeout') || message.includes('aborted')) {
      return NextResponse.json({ error: 'AI request timed out — try fewer or smaller files' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Photo analysis service temporarily unavailable' }, { status: 502 });
  }
}

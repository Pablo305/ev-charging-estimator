import { NextResponse } from 'next/server';
import { isOpenAIAvailable, chatCompletion } from '@/lib/ai/openai-client';
import { buildReviewPrompt } from '@/lib/ai/prompts';
import { ReviewEstimateResponse } from '@/lib/ai/types';

export async function POST(request: Request) {
  if (!isOpenAIAvailable()) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.' },
      { status: 501 },
    );
  }

  try {
    const { input, output } = await request.json();

    if (!input || !output) {
      return NextResponse.json({ error: 'input and output required' }, { status: 400 });
    }

    const { system, user } = buildReviewPrompt(input, output);

    const raw = await chatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { jsonMode: true, temperature: 0.2, maxTokens: 4096 },
    );

    let parsed: ReviewEstimateResponse;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid response. Please try again.' }, { status: 502 });
    }

    // Strip any suggested changes that try to modify pricing
    if (parsed.suggestedChanges) {
      parsed.suggestedChanges = parsed.suggestedChanges.filter(
        (c) => !c.field.includes('estimateControls') && !c.field.includes('Price') && !c.field.includes('total'),
      );
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('Review estimate error:', err);
    return NextResponse.json({ error: 'AI review service temporarily unavailable' }, { status: 502 });
  }
}

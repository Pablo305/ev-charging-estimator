import { NextResponse } from 'next/server';
import { isOpenAIAvailable, chatCompletion } from '@/lib/ai/openai-client';
import {
  buildSOWParserPrompt,
  buildTabularSOWParserPrompt,
  detectTabularSOW,
} from '@/lib/ai/prompts';
import type { EstimateInput, SOWLineItem } from '@/lib/estimate/types';
import type { SOWParseResponse } from '@/lib/ai/types';

function normalizeRawLineItems(items: unknown): SOWLineItem[] | undefined {
  if (!Array.isArray(items)) return undefined;
  const out: SOWLineItem[] = [];
  for (const row of items) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const description = typeof r.description === 'string' ? r.description.trim() : '';
    if (!description) continue;
    const quantity = Number(r.quantity);
    const unitPrice = Number(r.unitPrice);
    const amount = Number(r.amount);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || !Number.isFinite(amount)) continue;
    const unit = typeof r.unit === 'string' && r.unit.trim() ? r.unit.trim() : 'EA';
    const category = typeof r.category === 'string' ? r.category : undefined;
    const catalogMatch = typeof r.catalogMatch === 'string' ? r.catalogMatch : undefined;
    out.push({
      description,
      quantity,
      unit,
      unitPrice,
      amount,
      category,
      catalogMatch,
    });
  }
  return out.length > 0 ? out : undefined;
}

export async function POST(request: Request) {
  if (!isOpenAIAvailable()) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.' },
      { status: 501 },
    );
  }

  try {
    const { rawText } = await request.json();

    if (!rawText || typeof rawText !== 'string' || rawText.length > 50000) {
      return NextResponse.json(
        { error: 'rawText is required and must be under 50,000 characters' },
        { status: 400 },
      );
    }

    const tabular = detectTabularSOW(rawText);
    const { system, user } = tabular
      ? buildTabularSOWParserPrompt(rawText)
      : buildSOWParserPrompt(rawText);

    const raw = await chatCompletion(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { jsonMode: true, temperature: 0.1 },
    );

    let p: Record<string, unknown>;
    try {
      p = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'AI returned invalid response. Please try again.' }, { status: 502 });
    }

    const parsedInput = (p.parsedInput ?? {}) as Partial<EstimateInput>;
    if (parsedInput.estimateControls) {
      delete (parsedInput as Record<string, unknown>).estimateControls;
    }

    const sowFormat: 'tabular' | 'narrative' =
      p.sowFormat === 'tabular' || p.sowFormat === 'narrative'
        ? (p.sowFormat as 'tabular' | 'narrative')
        : tabular
          ? 'tabular'
          : 'narrative';

    const rawLineItems = normalizeRawLineItems(p.rawLineItems);

    const effectiveFormat: 'tabular' | 'narrative' =
      rawLineItems && rawLineItems.length > 0 ? 'tabular' : sowFormat;

    const response: SOWParseResponse = {
      parsedInput,
      confidence: typeof p.confidence === 'number' ? p.confidence : 0.5,
      missingFields: Array.isArray(p.missingFields) ? (p.missingFields as string[]) : [],
      assumptions: Array.isArray(p.assumptions) ? (p.assumptions as string[]) : [],
      sowFormat: effectiveFormat,
      rawLineItems: effectiveFormat === 'tabular' ? rawLineItems : undefined,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error('Parse SOW error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('timeout') || message.includes('aborted')) {
      return NextResponse.json({ error: 'AI request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Document parsing service temporarily unavailable' }, { status: 502 });
  }
}

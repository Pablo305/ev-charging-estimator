import { NextResponse } from 'next/server';
import type { EstimateOutput } from '@/lib/estimate/types';
import { buildPreviewAssetsFromOutput } from '@/lib/map/static-preview-urls';
import { createSharedEstimate } from '@/lib/estimate/repository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const output = body?.output as EstimateOutput | undefined;
    if (!output || typeof output !== 'object' || !output.input || !output.lineItems) {
      return NextResponse.json({ error: 'Invalid body: { output: EstimateOutput } required' }, { status: 400 });
    }

    const previewAssets = buildPreviewAssetsFromOutput(output);
    const record = await createSharedEstimate({
      output,
      previewAssets: Object.keys(previewAssets).length ? previewAssets : undefined,
      status: 'public',
    });

    return NextResponse.json({
      id: record.id,
      url: `/e/${record.id}`,
      createdAt: record.createdAt,
    });
  } catch (err: unknown) {
    console.error('Share estimate error:', err);
    return NextResponse.json({ error: 'Failed to save. Please try again.' }, { status: 500 });
  }
}

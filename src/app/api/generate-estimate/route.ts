import { NextResponse } from 'next/server';
import { generateEstimate } from '@/lib/estimate/engine';
import { EstimateInput } from '@/lib/estimate/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = body as EstimateInput;

    // Basic validation
    if (!input.project?.name || !input.charger?.brand) {
      return NextResponse.json(
        { error: 'Missing required fields: project.name, charger.brand' },
        { status: 400 },
      );
    }

    const output = generateEstimate(input);
    return NextResponse.json(output);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate estimate: ${message}` },
      { status: 500 },
    );
  }
}

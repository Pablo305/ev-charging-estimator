import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = process.env.MONDAY_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      {
        error: 'MONDAY_API_TOKEN not configured',
        hint: 'Set MONDAY_API_TOKEN environment variable to enable live monday.com integration',
      },
      { status: 501 },
    );
  }

  try {
    const query = `
      query ($itemId: [ID!]) {
        items(ids: $itemId) {
          id
          name
          column_values {
            id
            value
            text
          }
        }
      }
    `;

    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({
        query,
        variables: { itemId: [id] },
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `monday.com API returned ${response.status}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    const item = data?.data?.items?.[0];

    if (!item) {
      return NextResponse.json(
        { error: `Item ${id} not found` },
        { status: 404 },
      );
    }

    // Return raw item for now - normalization happens client-side or in a separate step
    return NextResponse.json({
      raw: item,
      note: 'Use /api/generate-estimate with normalized input to generate estimate',
    });
  } catch (err: unknown) {
    console.error('Monday item fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch project data' },
      { status: 500 },
    );
  }
}

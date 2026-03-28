import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SATELLITE_ANALYSIS_PROMPT = `You are analyzing a satellite/aerial image of a property for EV charger installation estimating.

Analyze the visible site and return ONLY a JSON response with these fields:

{
  "siteDescription": "Brief description of what you see from above",
  "inferredFields": {
    "parkingEnvironment.type": "surface_lot | parking_garage | mixed | null",
    "parkingEnvironment.surfaceType": "asphalt | concrete | gravel | other | null",
    "site.siteType": "hotel | apartment | retail | office | industrial | fuel_station | other | null",
    "parkingEnvironment.trafficControlRequired": true | false | null
  },
  "estimatedParkingSpaces": null,
  "suggestedChargerCount": { "min": null, "max": null, "reasoning": "..." },
  "concerns": ["List any installation concerns visible from aerial view"],
  "confidence": 0.75
}

Rules:
- Only report what is VISIBLE from the aerial/satellite view
- For uncertain observations, lower the confidence score
- Never claim hidden electrical capacity or buried conditions
- Do not estimate any costs or prices
- estimatedParkingSpaces should be your best count of visible parking spots
- suggestedChargerCount uses 3-5% of parking spaces for EV adoption`;

// Allowed field paths that may appear in AI response inferredFields
const ALLOWED_INFERRED_FIELDS = new Set([
  'parkingEnvironment.type',
  'parkingEnvironment.surfaceType',
  'site.siteType',
  'parkingEnvironment.trafficControlRequired',
]);

// Validate and sanitize the AI analysis response
function sanitizeAnalysis(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const result: Record<string, unknown> = {};

  // siteDescription — string only
  if (typeof obj.siteDescription === 'string') {
    result.siteDescription = obj.siteDescription.slice(0, 500);
  }

  // inferredFields — only allowlisted keys
  if (typeof obj.inferredFields === 'object' && obj.inferredFields !== null) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj.inferredFields as Record<string, unknown>)) {
      if (ALLOWED_INFERRED_FIELDS.has(key)) {
        // Only allow string, boolean, or null values
        if (typeof value === 'string' || typeof value === 'boolean' || value === null) {
          cleaned[key] = value;
        }
      }
    }
    result.inferredFields = cleaned;
  }

  // estimatedParkingSpaces — number or null
  if (typeof obj.estimatedParkingSpaces === 'number' && Number.isFinite(obj.estimatedParkingSpaces)) {
    result.estimatedParkingSpaces = Math.round(obj.estimatedParkingSpaces);
  } else {
    result.estimatedParkingSpaces = null;
  }

  // suggestedChargerCount — structured
  if (typeof obj.suggestedChargerCount === 'object' && obj.suggestedChargerCount !== null) {
    const sc = obj.suggestedChargerCount as Record<string, unknown>;
    result.suggestedChargerCount = {
      min: typeof sc.min === 'number' && Number.isFinite(sc.min) ? Math.round(sc.min) : null,
      max: typeof sc.max === 'number' && Number.isFinite(sc.max) ? Math.round(sc.max) : null,
      reasoning: typeof sc.reasoning === 'string' ? sc.reasoning.slice(0, 300) : '',
    };
  }

  // concerns — string array
  if (Array.isArray(obj.concerns)) {
    result.concerns = obj.concerns
      .filter((c): c is string => typeof c === 'string')
      .slice(0, 10)
      .map((c) => c.slice(0, 200));
  }

  // confidence — number 0-1
  if (typeof obj.confidence === 'number' && Number.isFinite(obj.confidence)) {
    result.confidence = Math.max(0, Math.min(1, obj.confidence));
  }

  return result;
}

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured' },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();

    // Validate lat/lng at runtime — reject imageUrl entirely (SSRF prevention)
    const lat = typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : undefined;
    const lng = typeof body.lng === 'number' && Number.isFinite(body.lng) ? body.lng : undefined;

    if (lat !== undefined && (lat < -90 || lat > 90)) {
      return NextResponse.json({ error: 'lat must be between -90 and 90' }, { status: 400 });
    }
    if (lng !== undefined && (lng < -180 || lng > 180)) {
      return NextResponse.json({ error: 'lng must be between -180 and 180' }, { status: 400 });
    }

    // Only allow server-constructed Mapbox URLs — no user-supplied imageUrl (SSRF prevention)
    let satelliteImageUrl: string | null = null;
    if (lat !== undefined && lng !== undefined) {
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (mapboxToken) {
        satelliteImageUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},18,0/800x600@2x?access_token=${mapboxToken}`;
      }
    }

    if (!satelliteImageUrl) {
      return NextResponse.json(
        { error: 'Valid lat/lng coordinates required' },
        { status: 400 },
      );
    }

    // Call Gemini Vision API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SATELLITE_ANALYSIS_PROMPT },
              {
                fileData: {
                  mimeType: 'image/jpeg',
                  fileUri: satelliteImageUrl,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!geminiResponse.ok) {
      // Log full error server-side, return generic message to client
      const errText = await geminiResponse.text();
      console.error('Gemini API error:', errText);
      return NextResponse.json(
        { error: 'AI analysis service unavailable' },
        { status: 502 },
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*?\}(?=[^}]*$)/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response' }, { status: 502 });
    }

    // Parse and sanitize — never pass raw AI output to client
    let rawAnalysis: unknown;
    try {
      rawAnalysis = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 502 });
    }

    const analysis = sanitizeAnalysis(rawAnalysis);
    if (!analysis) {
      return NextResponse.json({ error: 'AI response failed validation' }, { status: 502 });
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('analyze-site error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

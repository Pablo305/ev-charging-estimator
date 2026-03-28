import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const STREETVIEW_ANALYSIS_PROMPT = `You are analyzing a Google Street View image of a property for EV charger installation estimating. This is a ground-level view — you can see details that satellite imagery cannot.

Analyze the visible site and return ONLY a JSON response:

{
  "siteDescription": "Brief description of what you see at ground level",
  "inferredFields": {
    "parkingEnvironment.surfaceType": "asphalt | concrete | gravel | other | null",
    "parkingEnvironment.type": "surface_lot | parking_garage | mixed | null",
    "charger.mountType": "pedestal | wall | null",
    "parkingEnvironment.trafficControlRequired": true | false | null
  },
  "observations": {
    "wallSurfaces": "Description of visible wall materials and mount points",
    "electricalInfra": "Visible electrical panels, conduit runs, transformers, meters",
    "parkingCondition": "Surface condition, cracks, drainage, grade",
    "accessPoints": "Driveways, gates, bollards, narrow entries",
    "existingChargers": "Any existing EV chargers visible",
    "heightClearance": "Estimated clearance if garage/covered structure visible",
    "lightingConditions": "Existing lighting poles, fixtures (can double as charger mounts)"
  },
  "mountRecommendation": {
    "type": "pedestal | wall | pole_mount",
    "reason": "Why this mount type suits this location",
    "suggestedLocations": "Where on the property chargers should go based on what you see"
  },
  "concerns": ["List any installation concerns visible from street level"],
  "confidence": 0.75
}

Rules:
- Only report what is VISIBLE in the ground-level image
- Pay special attention to wall surfaces, electrical panels, conduit paths, and parking layout
- Note any ADA compliance concerns (accessible parking, paths of travel)
- Do not estimate any costs or prices
- For uncertain observations, lower the confidence score`;

// Allowed field paths for sanitization
const ALLOWED_FIELDS = new Set([
  'parkingEnvironment.surfaceType',
  'parkingEnvironment.type',
  'charger.mountType',
  'parkingEnvironment.trafficControlRequired',
]);

function sanitizeAnalysis(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  if (typeof obj.siteDescription === 'string') {
    result.siteDescription = obj.siteDescription.slice(0, 500);
  }

  // Sanitize inferredFields
  if (typeof obj.inferredFields === 'object' && obj.inferredFields !== null) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj.inferredFields as Record<string, unknown>)) {
      if (ALLOWED_FIELDS.has(key)) {
        if (typeof value === 'string' || typeof value === 'boolean' || value === null) {
          cleaned[key] = value;
        }
      }
    }
    result.inferredFields = cleaned;
  }

  // Pass through observations (all strings, capped)
  if (typeof obj.observations === 'object' && obj.observations !== null) {
    const obs: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj.observations as Record<string, unknown>)) {
      if (typeof value === 'string') {
        obs[key] = value.slice(0, 300);
      }
    }
    result.observations = obs;
  }

  // Mount recommendation
  if (typeof obj.mountRecommendation === 'object' && obj.mountRecommendation !== null) {
    const mr = obj.mountRecommendation as Record<string, unknown>;
    result.mountRecommendation = {
      type: typeof mr.type === 'string' ? mr.type.slice(0, 50) : null,
      reason: typeof mr.reason === 'string' ? mr.reason.slice(0, 300) : '',
      suggestedLocations: typeof mr.suggestedLocations === 'string'
        ? mr.suggestedLocations.slice(0, 300) : '',
    };
  }

  // Concerns
  if (Array.isArray(obj.concerns)) {
    result.concerns = obj.concerns
      .filter((c): c is string => typeof c === 'string')
      .slice(0, 10)
      .map((c) => c.slice(0, 200));
  }

  // Confidence
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
    const { imageUrl } = body as { imageUrl?: string };

    // Only allow Google Street View Static API URLs — parse to prevent SSRF
    let parsedUrl: URL | null = null;
    try {
      if (imageUrl && typeof imageUrl === 'string') parsedUrl = new URL(imageUrl);
    } catch { /* invalid URL */ }
    if (
      !parsedUrl ||
      parsedUrl.protocol !== 'https:' ||
      parsedUrl.hostname !== 'maps.googleapis.com' ||
      !parsedUrl.pathname.startsWith('/maps/api/streetview')
    ) {
      return NextResponse.json(
        { error: 'Valid Google Street View Static API URL required' },
        { status: 400 },
      );
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: STREETVIEW_ANALYSIS_PROMPT },
              {
                fileData: {
                  mimeType: 'image/jpeg',
                  fileUri: imageUrl,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', await geminiResponse.text());
      return NextResponse.json(
        { error: 'AI analysis service unavailable' },
        { status: 502 },
      );
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response' }, { status: 502 });
    }

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
    console.error('analyze-streetview error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

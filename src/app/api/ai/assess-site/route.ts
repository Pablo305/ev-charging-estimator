import { NextRequest, NextResponse } from 'next/server';
import type { MergedInference, SmartQuestion } from '@/lib/ai/site-assessment-types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_SERVER_KEY ?? null;

// ── Enhanced Satellite Prompt (EV-charger hyper-tuned) ──

const ENHANCED_SATELLITE_PROMPT = `You are an expert EV charger site assessor analyzing a satellite/aerial image for commercial EV charger installation.

Analyze the visible site and return ONLY a JSON response:

{
  "siteDescription": "Brief description of what you see from above",
  "inferredFields": {
    "parkingEnvironment.type": "surface_lot | parking_garage | mixed | null",
    "parkingEnvironment.surfaceType": "asphalt | concrete | gravel | other | null",
    "site.siteType": "hotel | apartment | retail | office | industrial | fuel_station | other | null",
    "parkingEnvironment.trafficControlRequired": true | false | null
  },
  "estimatedParkingSpaces": null,
  "suggestedChargerCount": { "min": null, "max": null, "reasoning": "Based on 3-5% EV adoption rate of visible parking" },
  "parkingLayoutGeometry": {
    "stallOrientation": "angled | perpendicular | parallel | mixed | null",
    "driveAisleWidthEstimate": "narrow | standard | wide | null",
    "adaZonesVisible": false,
    "surfaceTransitions": ["List transitions like 'asphalt-to-concrete at building perimeter'"]
  },
  "electricalInfrastructure": {
    "transformerPadVisible": false,
    "meterClusterVisible": false,
    "utilityPoleNearby": false,
    "estimatedPanelSide": "north | south | east | west side of building, or null"
  },
  "concerns": ["List any EV charger installation concerns"],
  "confidence": 0.75
}

EV CHARGER INSTALLATION FOCUS:
- Identify electrical panel locations, transformer pads, utility meter clusters on building exteriors
- Detect parking lot layout: stall orientation, drive aisle widths, ADA zones
- Assess surface transitions (asphalt-to-concrete boundaries = bore/trench decision points)
- Count parking spaces and suggest charger count (3-5% EV adoption rate)
- Detect existing EV chargers or electrical infrastructure
- Suggest optimal charger placement zones based on parking flow
- Note bollard/protection requirements near drive aisles
- Identify surface transitions that indicate different civil work methods

Rules:
- Only report what is VISIBLE from the aerial/satellite view
- For uncertain observations, lower the confidence score
- Never claim hidden electrical capacity or buried conditions
- Do not estimate any costs or prices
CRITICAL: You MUST NOT calculate, suggest, or output any dollar amounts or prices.`;

// ── Enhanced Street View Prompt ──

const ENHANCED_STREETVIEW_PROMPT = `You are an expert EV charger site assessor analyzing a Google Street View image for commercial EV charger installation.

Analyze the ground-level view and return ONLY a JSON response:

{
  "siteDescription": "Brief description of what you see at ground level",
  "inferredFields": {
    "parkingEnvironment.surfaceType": "asphalt | concrete | gravel | other | null",
    "parkingEnvironment.type": "surface_lot | parking_garage | mixed | null",
    "charger.mountType": "pedestal | wall | null",
    "parkingEnvironment.trafficControlRequired": true | false | null
  },
  "observations": {
    "wallSurfaces": "Wall materials, mount points, height, accessibility",
    "electricalInfra": "Visible panels, conduit runs, transformers, meters, junction boxes",
    "parkingCondition": "Surface condition, cracks, drainage, grade",
    "accessPoints": "Driveways, gates, bollards, narrow entries",
    "existingChargers": "Any existing EV chargers or infrastructure visible",
    "heightClearance": "Estimated clearance if garage/covered structure",
    "lightingConditions": "Existing lighting poles, fixtures"
  },
  "electricalObservation": {
    "panelVisible": false,
    "transformerVisible": false,
    "meterClusterVisible": false,
    "existingConduitVisible": false,
    "estimatedPanelLocation": "e.g. northwest corner of building, or empty string",
    "description": "Detailed description of visible electrical infrastructure"
  },
  "conduitRouting": {
    "existingConduitVisible": false,
    "wallMountFeasibility": "good | fair | poor | null",
    "wallMaterial": "brick | concrete | stucco | metal | wood | null",
    "routingOpportunities": ["e.g. existing conduit run along north wall"]
  },
  "adaCompliance": {
    "adaParkingVisible": false,
    "pathOfTravelClear": true,
    "concerns": ["Any ADA compliance concerns"]
  },
  "mountRecommendation": {
    "type": "pedestal | wall | pole_mount",
    "reason": "Why this mount type suits this location",
    "suggestedLocations": "Where chargers should go based on what you see"
  },
  "concerns": ["List any installation concerns visible from street level"],
  "confidence": 0.75
}

EV CHARGER INSTALLATION FOCUS:
- Identify electrical panels, transformers, meter banks, junction boxes with location descriptions
- Detect conduit pathways (wall-mounted, underground, overhead)
- Assess wall mounting feasibility (material: brick/concrete/stucco, height, access)
- Identify conduit routing opportunities (existing runs, wall channels, ceiling paths)
- Detect ADA parking and paths of travel
- Assess drive aisle widths for traffic control assessment
- Identify surface transitions indicating bore vs trench sections
- Estimate distance from visible electrical infrastructure to potential charger areas

Rules:
- Only report what is VISIBLE in the ground-level image
- Pay special attention to electrical panels, conduit paths, and parking layout
- Note any ADA compliance concerns
- Do not estimate any costs or prices
CRITICAL: You MUST NOT calculate, suggest, or output any dollar amounts or prices.`;

// ── Allowed fields for sanitization ──

const ALLOWED_SATELLITE_FIELDS = new Set([
  'parkingEnvironment.type',
  'parkingEnvironment.surfaceType',
  'site.siteType',
  'parkingEnvironment.trafficControlRequired',
]);

const ALLOWED_STREETVIEW_FIELDS = new Set([
  'parkingEnvironment.surfaceType',
  'parkingEnvironment.type',
  'charger.mountType',
  'parkingEnvironment.trafficControlRequired',
]);

// ── Sanitizers ──

function sanitizeSatelliteResult(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  if (typeof obj.siteDescription === 'string') {
    result.siteDescription = obj.siteDescription.slice(0, 500);
  }

  if (typeof obj.inferredFields === 'object' && obj.inferredFields !== null) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj.inferredFields as Record<string, unknown>)) {
      if (ALLOWED_SATELLITE_FIELDS.has(key)) {
        if (typeof value === 'string' || typeof value === 'boolean' || value === null) {
          cleaned[key] = value;
        }
      }
    }
    result.inferredFields = cleaned;
  }

  if (typeof obj.estimatedParkingSpaces === 'number' && Number.isFinite(obj.estimatedParkingSpaces)) {
    result.estimatedParkingSpaces = Math.round(obj.estimatedParkingSpaces);
  } else {
    result.estimatedParkingSpaces = null;
  }

  if (typeof obj.suggestedChargerCount === 'object' && obj.suggestedChargerCount !== null) {
    const sc = obj.suggestedChargerCount as Record<string, unknown>;
    result.suggestedChargerCount = {
      min: typeof sc.min === 'number' && Number.isFinite(sc.min) ? Math.round(sc.min) : null,
      max: typeof sc.max === 'number' && Number.isFinite(sc.max) ? Math.round(sc.max) : null,
      reasoning: typeof sc.reasoning === 'string' ? sc.reasoning.slice(0, 300) : '',
    };
  }

  // parkingLayoutGeometry
  if (typeof obj.parkingLayoutGeometry === 'object' && obj.parkingLayoutGeometry !== null) {
    const plg = obj.parkingLayoutGeometry as Record<string, unknown>;
    const validOrientations = new Set(['angled', 'perpendicular', 'parallel', 'mixed']);
    const validWidths = new Set(['narrow', 'standard', 'wide']);
    result.parkingLayoutGeometry = {
      stallOrientation: typeof plg.stallOrientation === 'string' && validOrientations.has(plg.stallOrientation) ? plg.stallOrientation : null,
      driveAisleWidthEstimate: typeof plg.driveAisleWidthEstimate === 'string' && validWidths.has(plg.driveAisleWidthEstimate) ? plg.driveAisleWidthEstimate : null,
      adaZonesVisible: plg.adaZonesVisible === true,
      surfaceTransitions: Array.isArray(plg.surfaceTransitions)
        ? plg.surfaceTransitions.filter((s): s is string => typeof s === 'string').slice(0, 10).map((s) => s.slice(0, 200))
        : [],
    };
  }

  // electricalInfrastructure
  if (typeof obj.electricalInfrastructure === 'object' && obj.electricalInfrastructure !== null) {
    const ei = obj.electricalInfrastructure as Record<string, unknown>;
    result.electricalInfrastructure = {
      transformerPadVisible: ei.transformerPadVisible === true,
      meterClusterVisible: ei.meterClusterVisible === true,
      utilityPoleNearby: ei.utilityPoleNearby === true,
      estimatedPanelSide: typeof ei.estimatedPanelSide === 'string' ? ei.estimatedPanelSide.slice(0, 100) : null,
    };
  }

  if (Array.isArray(obj.concerns)) {
    result.concerns = obj.concerns
      .filter((c): c is string => typeof c === 'string')
      .slice(0, 10)
      .map((c) => c.slice(0, 200));
  }

  if (typeof obj.confidence === 'number' && Number.isFinite(obj.confidence)) {
    result.confidence = Math.max(0, Math.min(1, obj.confidence));
  }

  return result;
}

function sanitizeStreetViewResult(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  if (typeof obj.siteDescription === 'string') {
    result.siteDescription = obj.siteDescription.slice(0, 500);
  }

  if (typeof obj.inferredFields === 'object' && obj.inferredFields !== null) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj.inferredFields as Record<string, unknown>)) {
      if (ALLOWED_STREETVIEW_FIELDS.has(key)) {
        if (typeof value === 'string' || typeof value === 'boolean' || value === null) {
          cleaned[key] = value;
        }
      }
    }
    result.inferredFields = cleaned;
  }

  // observations — only allowlisted keys
  const ALLOWED_OBSERVATION_KEYS = new Set([
    'wallSurfaces', 'electricalInfra', 'parkingCondition', 'accessPoints',
    'existingChargers', 'heightClearance', 'lightingConditions',
  ]);
  if (typeof obj.observations === 'object' && obj.observations !== null) {
    const obs: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj.observations as Record<string, unknown>)) {
      if (ALLOWED_OBSERVATION_KEYS.has(key) && typeof value === 'string') {
        obs[key] = value.slice(0, 300);
      }
    }
    result.observations = obs;
  }

  // electricalObservation
  if (typeof obj.electricalObservation === 'object' && obj.electricalObservation !== null) {
    const eo = obj.electricalObservation as Record<string, unknown>;
    result.electricalObservation = {
      panelVisible: eo.panelVisible === true,
      transformerVisible: eo.transformerVisible === true,
      meterClusterVisible: eo.meterClusterVisible === true,
      existingConduitVisible: eo.existingConduitVisible === true,
      estimatedPanelLocation: typeof eo.estimatedPanelLocation === 'string' ? eo.estimatedPanelLocation.slice(0, 200) : '',
      description: typeof eo.description === 'string' ? eo.description.slice(0, 500) : '',
    };
  }

  // conduitRouting
  if (typeof obj.conduitRouting === 'object' && obj.conduitRouting !== null) {
    const cr = obj.conduitRouting as Record<string, unknown>;
    const validFeasibility = new Set(['good', 'fair', 'poor']);
    const validMaterials = new Set(['brick', 'concrete', 'stucco', 'metal', 'wood']);
    result.conduitRouting = {
      existingConduitVisible: cr.existingConduitVisible === true,
      wallMountFeasibility: typeof cr.wallMountFeasibility === 'string' && validFeasibility.has(cr.wallMountFeasibility) ? cr.wallMountFeasibility : null,
      wallMaterial: typeof cr.wallMaterial === 'string' && validMaterials.has(cr.wallMaterial) ? cr.wallMaterial : null,
      routingOpportunities: Array.isArray(cr.routingOpportunities)
        ? cr.routingOpportunities.filter((s): s is string => typeof s === 'string').slice(0, 5).map((s) => s.slice(0, 200))
        : [],
    };
  }

  // adaCompliance
  if (typeof obj.adaCompliance === 'object' && obj.adaCompliance !== null) {
    const ada = obj.adaCompliance as Record<string, unknown>;
    result.adaCompliance = {
      adaParkingVisible: ada.adaParkingVisible === true,
      pathOfTravelClear: ada.pathOfTravelClear !== false,
      concerns: Array.isArray(ada.concerns)
        ? ada.concerns.filter((s): s is string => typeof s === 'string').slice(0, 5).map((s) => s.slice(0, 200))
        : [],
    };
  }

  // mountRecommendation
  if (typeof obj.mountRecommendation === 'object' && obj.mountRecommendation !== null) {
    const mr = obj.mountRecommendation as Record<string, unknown>;
    result.mountRecommendation = {
      type: typeof mr.type === 'string' ? mr.type.slice(0, 50) : null,
      reason: typeof mr.reason === 'string' ? mr.reason.slice(0, 300) : '',
      suggestedLocations: typeof mr.suggestedLocations === 'string' ? mr.suggestedLocations.slice(0, 300) : '',
    };
  }

  if (Array.isArray(obj.concerns)) {
    result.concerns = obj.concerns
      .filter((c): c is string => typeof c === 'string')
      .slice(0, 10)
      .map((c) => c.slice(0, 200));
  }

  if (typeof obj.confidence === 'number' && Number.isFinite(obj.confidence)) {
    result.confidence = Math.max(0, Math.min(1, obj.confidence));
  }

  return result;
}

// ── Merge logic ──

// Street view wins for surface/mount; satellite wins for layout/count
const STREETVIEW_PRIORITY_FIELDS = new Set([
  'parkingEnvironment.surfaceType',
  'charger.mountType',
  'parkingEnvironment.trafficControlRequired',
]);

function mergeAnalyses(
  satellite: Record<string, unknown> | null,
  streetView: Record<string, unknown> | null,
): { mergedInferences: MergedInference[]; unansweredQuestions: SmartQuestion[] } {
  const mergedInferences: MergedInference[] = [];
  const satFields = (satellite?.inferredFields ?? {}) as Record<string, unknown>;
  const svFields = (streetView?.inferredFields ?? {}) as Record<string, unknown>;
  const allFieldPaths = new Set([...Object.keys(satFields), ...Object.keys(svFields)]);

  for (const fieldPath of allFieldPaths) {
    const satVal = satFields[fieldPath] ?? null;
    const svVal = svFields[fieldPath] ?? null;

    if (satVal !== null && svVal !== null) {
      if (satVal === svVal) {
        mergedInferences.push({
          fieldPath,
          value: satVal,
          source: 'both',
          confidence: Math.min(((satellite?.confidence as number) ?? 0.5) + 0.1, 1),
          reasoning: 'Both satellite and street view agree',
        });
      } else if (STREETVIEW_PRIORITY_FIELDS.has(fieldPath)) {
        mergedInferences.push({
          fieldPath,
          value: svVal,
          source: 'streetview',
          confidence: (streetView?.confidence as number) ?? 0.5,
          reasoning: `Street view (${String(svVal)}) overrides satellite (${String(satVal)}) for ${fieldPath}`,
        });
      } else {
        mergedInferences.push({
          fieldPath,
          value: satVal,
          source: 'satellite',
          confidence: (satellite?.confidence as number) ?? 0.5,
          reasoning: `Satellite (${String(satVal)}) preferred for layout field ${fieldPath}`,
        });
      }
    } else if (svVal !== null) {
      mergedInferences.push({
        fieldPath,
        value: svVal,
        source: 'streetview',
        confidence: (streetView?.confidence as number) ?? 0.5,
        reasoning: 'Detected from street view analysis',
      });
    } else if (satVal !== null) {
      mergedInferences.push({
        fieldPath,
        value: satVal,
        source: 'satellite',
        confidence: (satellite?.confidence as number) ?? 0.5,
        reasoning: 'Detected from satellite analysis',
      });
    }
  }

  // Add charger count suggestion from satellite
  if (satellite?.suggestedChargerCount) {
    const sc = satellite.suggestedChargerCount as { min: number | null; max: number | null; reasoning: string };
    if (sc.min !== null || sc.max !== null) {
      const suggested = sc.max ?? sc.min ?? 2;
      mergedInferences.push({
        fieldPath: 'charger.count',
        value: suggested,
        source: 'satellite',
        confidence: (satellite.confidence as number) ?? 0.5,
        reasoning: sc.reasoning || `Suggested ${suggested} chargers based on parking capacity`,
      });
    }
  }

  // Generate smart questions for unknowns
  const unansweredQuestions: SmartQuestion[] = [];
  const inferredPaths = new Set(mergedInferences.map((m) => m.fieldPath));

  // Always ask (never detectable from imagery)
  const chargerCountInference = mergedInferences.find((m) => m.fieldPath === 'charger.count');
  unansweredQuestions.push({
    id: 'q-charger-brand',
    fieldPath: 'charger.brand',
    question: 'What charger brand/model will be installed?',
    type: 'select',
    aiSuggestion: null,
    options: [
      { label: 'ChargePoint', value: 'ChargePoint' },
      { label: 'Tesla', value: 'Tesla' },
      { label: 'Blink', value: 'Blink' },
      { label: 'SWTCH', value: 'SWTCH' },
      { label: 'EV Connect', value: 'EV Connect' },
      { label: 'Xeal', value: 'Xeal' },
      { label: 'Other', value: 'other' },
    ],
    priority: 'blocking',
  });

  unansweredQuestions.push({
    id: 'q-charger-count',
    fieldPath: 'charger.count',
    question: 'How many chargers will be installed?',
    type: 'number',
    aiSuggestion: chargerCountInference?.value ?? null,
    priority: 'blocking',
  });

  unansweredQuestions.push({
    id: 'q-charging-level',
    fieldPath: 'charger.chargingLevel',
    question: 'Charging level?',
    type: 'select',
    aiSuggestion: null,
    options: [
      { label: 'Level 2 (240V)', value: 'l2' },
      { label: 'Level 3 DCFC (480V)', value: 'l3_dcfc' },
    ],
    priority: 'blocking',
  });

  // Conditionally ask based on AI detection
  const detectedType = mergedInferences.find((m) => m.fieldPath === 'parkingEnvironment.type');
  if (detectedType?.value === 'parking_garage' || detectedType?.value === 'mixed') {
    unansweredQuestions.push({
      id: 'q-pt-slab',
      fieldPath: 'parkingEnvironment.hasPTSlab',
      question: 'We detected a parking garage. Is there a post-tensioned slab?',
      type: 'confirm',
      aiSuggestion: null,
      priority: 'important',
    });
  }

  if (!inferredPaths.has('site.siteType')) {
    unansweredQuestions.push({
      id: 'q-site-type',
      fieldPath: 'site.siteType',
      question: 'What type of site is this?',
      type: 'select',
      aiSuggestion: null,
      options: [
        { label: 'Hotel', value: 'hotel' },
        { label: 'Apartment', value: 'apartment' },
        { label: 'Retail', value: 'retail' },
        { label: 'Office', value: 'office' },
        { label: 'Industrial', value: 'industrial' },
        { label: 'Fuel Station', value: 'fuel_station' },
        { label: 'Other', value: 'other' },
      ],
      priority: 'important',
    });
  }

  return { mergedInferences, unansweredQuestions };
}

// ── Call Gemini with image ──

async function callGemini(prompt: string, imageUrl: string, maxTokens: number): Promise<unknown> {
  const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { fileData: { mimeType: 'image/jpeg', fileUri: imageUrl } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('Gemini API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === 'AbortError') {
      console.error('Gemini API call timed out after 30s');
    }
    return null;
  }
}

// ── Main route handler ──

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();

    const lat = typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : undefined;
    const lng = typeof body.lng === 'number' && Number.isFinite(body.lng) ? body.lng : undefined;

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Valid lat/lng coordinates required' }, { status: 400 });
    }
    if (lat < -90 || lat > 90) {
      return NextResponse.json({ error: 'lat must be between -90 and 90' }, { status: 400 });
    }
    if (lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'lng must be between -180 and 180' }, { status: 400 });
    }

    // Construct satellite image URL (server-side — SSRF prevention)
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      return NextResponse.json({ error: 'Mapbox token not configured' }, { status: 500 });
    }
    const satelliteImageUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},18,0/800x600@2x?access_token=${mapboxToken}`;

    // Construct 4 Street View URLs at cardinal directions (server-side — SSRF prevention)
    const streetViewUrls: string[] = [];
    if (GOOGLE_MAPS_KEY) {
      for (const heading of [0, 90, 180, 270]) {
        streetViewUrls.push(
          `https://maps.googleapis.com/maps/api/streetview?size=800x600&location=${lat},${lng}&heading=${heading}&pitch=0&key=${GOOGLE_MAPS_KEY}`,
        );
      }
    }

    // Run satellite + street view analyses in parallel
    const satellitePromise = callGemini(ENHANCED_SATELLITE_PROMPT, satelliteImageUrl, 2048);

    const streetViewPromise = streetViewUrls.length > 0
      ? callGemini(
          ENHANCED_STREETVIEW_PROMPT,
          streetViewUrls[0], // Primary view (north-facing)
          2048,
        )
      : Promise.resolve(null);

    const [rawSatellite, rawStreetView] = await Promise.all([satellitePromise, streetViewPromise]);

    const satelliteAnalysis = sanitizeSatelliteResult(rawSatellite);
    const streetViewAnalysis = sanitizeStreetViewResult(rawStreetView);

    if (!satelliteAnalysis && !streetViewAnalysis) {
      return NextResponse.json({ error: 'AI analysis failed for both satellite and street view' }, { status: 502 });
    }

    // Merge with deterministic priority rules
    const { mergedInferences, unansweredQuestions } = mergeAnalyses(satelliteAnalysis, streetViewAnalysis);

    const satConfidence = (satelliteAnalysis?.confidence as number) ?? 0;
    const svConfidence = (streetViewAnalysis?.confidence as number) ?? 0;
    const overallConfidence = satelliteAnalysis && streetViewAnalysis
      ? (satConfidence + svConfidence) / 2
      : satConfidence || svConfidence;

    return NextResponse.json({
      siteIntelligence: {
        satelliteAnalysis,
        streetViewAnalysis,
        mergedInferences,
        unansweredQuestions,
        overallConfidence: Math.round(overallConfidence * 100) / 100,
      },
    });
  } catch (err) {
    console.error('assess-site error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

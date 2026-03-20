import {
  EstimateInput,
  MapAppliedField,
  MapCoordinate,
  MapFeatureType,
  SiteMapFeature,
  SiteMapPlan,
  SiteMapPointFeature,
  SiteMapSummary,
} from './types';

const FEET_PER_METER = 3.28084;
const SQUARE_FEET_PER_SQUARE_METER = 10.7639;
const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function clampCoordinate(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function emptySiteMapSummary(): SiteMapSummary {
  return {
    chargerCount: 0,
    panelCount: 0,
    mechanicalRoomCount: 0,
    bollardCount: 0,
    padCount: 0,
    trenchLengthFt: 0,
    conduitLengthFt: 0,
    restrictedZoneCount: 0,
    parkingZoneCount: 0,
  };
}

export function createEmptySiteMapPlan(
  center: MapCoordinate | null = null,
): SiteMapPlan {
  return {
    center,
    zoom: 17,
    features: [],
    summary: emptySiteMapSummary(),
    appliedFields: {},
    lastAppliedAt: null,
  };
}

export function distanceBetweenPointsFt(
  start: MapCoordinate,
  end: MapCoordinate,
): number {
  const lat1 = toRadians(start.lat);
  const lat2 = toRadians(end.lat);
  const deltaLat = toRadians(end.lat - start.lat);
  const deltaLng = toRadians(end.lng - start.lng);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_RADIUS_METERS * arc * FEET_PER_METER;
}

export function polylineLengthFt(points: MapCoordinate[]): number {
  if (points.length < 2) return 0;

  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distanceBetweenPointsFt(points[index - 1], points[index]);
  }

  return total;
}

export function polygonAreaSqFt(points: MapCoordinate[]): number {
  if (points.length < 3) return 0;

  const centerLat =
    points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const centerLng =
    points.reduce((sum, point) => sum + point.lng, 0) / points.length;

  const projected = points.map((point) => {
    const x =
      toRadians(point.lng - centerLng) *
      EARTH_RADIUS_METERS *
      Math.cos(toRadians(centerLat));
    const y = toRadians(point.lat - centerLat) * EARTH_RADIUS_METERS;
    return { x, y };
  });

  let area = 0;
  for (let index = 0; index < projected.length; index += 1) {
    const current = projected[index];
    const next = projected[(index + 1) % projected.length];
    area += current.x * next.y - next.x * current.y;
  }

  return Math.abs(area / 2) * SQUARE_FEET_PER_SQUARE_METER;
}

export function buildAutoLabel(
  features: SiteMapFeature[],
  type: MapFeatureType,
): string {
  const count = features.filter((feature) => feature.type === type).length + 1;

  const labels: Record<MapFeatureType, string> = {
    charger: 'Charger',
    electrical_panel: 'Panel',
    mechanical_room: 'Mechanical Room',
    bollard: 'Bollard',
    pad: 'Pad',
    trench: 'Trench Run',
    conduit: 'Conduit Run',
    restricted_zone: 'Restricted Zone',
    parking_zone: 'Parking Zone',
  };

  return `${labels[type]} ${count}`;
}

export function normalizeSiteMapPlan(
  rawPlan: SiteMapPlan | null | undefined,
): SiteMapPlan {
  const basePlan = rawPlan ?? createEmptySiteMapPlan();
  const features = (basePlan.features ?? []).map((feature) => {
    if (feature.geometryType === 'LineString') {
      return {
        ...feature,
        lengthFt: Math.round(polylineLengthFt(feature.coordinates)),
      };
    }

    if (feature.geometryType === 'Polygon') {
      return {
        ...feature,
        areaSqFt: Math.round(polygonAreaSqFt(feature.coordinates)),
      };
    }

    return feature;
  });

  const summary = emptySiteMapSummary();

  for (const feature of features) {
    switch (feature.type) {
      case 'charger':
        summary.chargerCount += 1;
        break;
      case 'electrical_panel':
        summary.panelCount += 1;
        break;
      case 'mechanical_room':
        summary.mechanicalRoomCount += 1;
        break;
      case 'bollard':
        summary.bollardCount += 1;
        break;
      case 'pad':
        summary.padCount += 1;
        break;
      case 'trench':
        if (feature.geometryType === 'LineString') {
          summary.trenchLengthFt += feature.lengthFt;
        } else {
          summary.trenchLengthFt += 0;
        }
        break;
      case 'conduit':
        if (feature.geometryType === 'LineString') {
          summary.conduitLengthFt += feature.lengthFt;
        } else {
          summary.conduitLengthFt += 0;
        }
        break;
      case 'restricted_zone':
        summary.restrictedZoneCount += 1;
        break;
      case 'parking_zone':
        summary.parkingZoneCount += 1;
        break;
      default:
        break;
    }
  }

  return {
    ...basePlan,
    center: basePlan.center
      ? {
          lat: clampCoordinate(basePlan.center.lat, 33.7488),
          lng: clampCoordinate(basePlan.center.lng, -84.3877),
        }
      : null,
    features,
    summary: {
      ...summary,
      trenchLengthFt: Math.round(summary.trenchLengthFt),
      conduitLengthFt: Math.round(summary.conduitLengthFt),
    },
  };
}

function findMapFeatureIds(
  features: SiteMapFeature[],
  types: MapFeatureType[],
): string[] {
  return features
    .filter((feature) => types.includes(feature.type))
    .map((feature) => feature.id);
}

function createAppliedField(
  value: MapAppliedField['value'],
  featureIds: string[],
  featureTypes: MapFeatureType[],
  reasoning: string,
): MapAppliedField {
  return {
    value,
    featureIds,
    featureTypes,
    reasoning,
  };
}

function buildPanelDistanceFt(features: SiteMapFeature[]): number | null {
  const panel = features.find(
    (feature): feature is SiteMapPointFeature =>
      feature.type === 'electrical_panel' && feature.geometryType === 'Point',
  );
  const chargers = features.filter(
    (feature): feature is SiteMapPointFeature =>
      feature.type === 'charger' && feature.geometryType === 'Point',
  );

  if (!panel || chargers.length === 0) {
    return null;
  }

  const distances = chargers.map((feature) =>
    distanceBetweenPointsFt(panel.coordinates, feature.coordinates),
  );

  return Math.round(Math.max(...distances));
}

function buildMapNarrative(plan: SiteMapPlan): string {
  const parts: string[] = [];

  if (plan.summary.chargerCount > 0) {
    parts.push(`${plan.summary.chargerCount} charger position(s)`);
  }
  if (plan.summary.panelCount > 0) {
    parts.push(`${plan.summary.panelCount} electrical panel marker(s)`);
  }
  if (plan.summary.mechanicalRoomCount > 0) {
    parts.push(`${plan.summary.mechanicalRoomCount} mechanical room marker(s)`);
  }
  if (plan.summary.trenchLengthFt > 0) {
    parts.push(`${plan.summary.trenchLengthFt} ft of trench routing`);
  }
  if (plan.summary.conduitLengthFt > 0) {
    parts.push(`${plan.summary.conduitLengthFt} ft of conduit routing`);
  }
  if (plan.summary.bollardCount > 0) {
    parts.push(`${plan.summary.bollardCount} bollard location(s)`);
  }
  if (plan.summary.padCount > 0) {
    parts.push(`${plan.summary.padCount} pad location(s)`);
  }
  if (plan.summary.restrictedZoneCount > 0) {
    parts.push(`${plan.summary.restrictedZoneCount} restricted zone(s)`);
  }

  return parts.length > 0
    ? `Map plan applied: ${parts.join(', ')}.`
    : 'Map plan available but no scope-driving features have been drawn yet.';
}

export function deriveAppliedFields(
  plan: SiteMapPlan,
): Record<string, MapAppliedField> {
  const appliedFields: Record<string, MapAppliedField> = {};
  const { features, summary } = plan;

  if (summary.chargerCount > 0) {
    appliedFields['charger.count'] = createAppliedField(
      summary.chargerCount,
      findMapFeatureIds(features, ['charger']),
      ['charger'],
      'Derived from charger markers placed on the map.',
    );
  }

  if (summary.bollardCount > 0) {
    appliedFields['accessories.bollardQty'] = createAppliedField(
      summary.bollardCount,
      findMapFeatureIds(features, ['bollard']),
      ['bollard'],
      'Derived from bollard markers placed on the map.',
    );
  }

  if (summary.padCount > 0) {
    appliedFields['accessories.padRequired'] = createAppliedField(
      true,
      findMapFeatureIds(features, ['pad']),
      ['pad'],
      'Pad requirement inferred from mapped pad locations.',
    );
  }

  if (summary.trenchLengthFt > 0) {
    appliedFields['parkingEnvironment.trenchingRequired'] = createAppliedField(
      true,
      findMapFeatureIds(features, ['trench']),
      ['trench'],
      'Trenching requirement inferred from trench route drawings.',
    );
  }

  const derivedDistance =
    summary.conduitLengthFt > 0
      ? summary.conduitLengthFt
      : summary.trenchLengthFt > 0
        ? summary.trenchLengthFt
        : buildPanelDistanceFt(features);

  if (derivedDistance && derivedDistance > 0) {
    const featureTypes: MapFeatureType[] =
      summary.conduitLengthFt > 0
        ? ['conduit']
        : summary.trenchLengthFt > 0
          ? ['trench']
          : ['electrical_panel', 'charger'];

    appliedFields['electrical.distanceToPanel_ft'] = createAppliedField(
      derivedDistance,
      findMapFeatureIds(features, featureTypes),
      featureTypes,
      'Estimated from map geometry. Conduit/trench paths take priority over straight-line panel-to-charger spacing.',
    );
  }

  if (summary.panelCount > 0 || summary.mechanicalRoomCount > 0) {
    appliedFields['electrical.electricalRoomDescription'] = createAppliedField(
      `Map includes ${summary.panelCount} panel marker(s) and ${summary.mechanicalRoomCount} mechanical room marker(s).`,
      findMapFeatureIds(features, ['electrical_panel', 'mechanical_room']),
      ['electrical_panel', 'mechanical_room'],
      'Generated from map markers for panel and mechanical room locations.',
    );
  }

  if (
    summary.chargerCount > 0 ||
    summary.restrictedZoneCount > 0 ||
    summary.padCount > 0 ||
    summary.trenchLengthFt > 0 ||
    summary.conduitLengthFt > 0
  ) {
    const featureTypes: MapFeatureType[] = [
      'charger',
      'restricted_zone',
      'pad',
      'trench',
      'conduit',
    ];

    appliedFields['civil.installationLocationDescription'] = createAppliedField(
      buildMapNarrative(plan),
      findMapFeatureIds(features, featureTypes),
      featureTypes,
      'Generated from the current map layout and construction features.',
    );
  }

  return appliedFields;
}

function setByPath(
  input: EstimateInput,
  path: string,
  value: unknown,
): void {
  const segments = path.split('.');
  let cursor: Record<string, unknown> = input as unknown as Record<
    string,
    unknown
  >;

  for (let index = 0; index < segments.length - 1; index += 1) {
    cursor = cursor[segments[index]] as Record<string, unknown>;
  }

  cursor[segments[segments.length - 1]] = value;
}

export function applyMapPlanToInput(
  input: EstimateInput,
  rawPlan: SiteMapPlan | null | undefined,
): EstimateInput {
  const nextInput = structuredClone(input);
  const normalizedPlan = normalizeSiteMapPlan(rawPlan);
  const appliedFields = deriveAppliedFields(normalizedPlan);

  if (!nextInput.site.mapPlan) {
    nextInput.site.mapPlan = createEmptySiteMapPlan();
  }

  nextInput.site.location = normalizedPlan.center;
  nextInput.site.mapPlan = {
    ...normalizedPlan,
    appliedFields,
    lastAppliedAt: new Date().toISOString(),
  };

  for (const [fieldPath, field] of Object.entries(appliedFields)) {
    setByPath(nextInput, fieldPath, field.value);
  }

  return nextInput;
}

export function clearMapAppliedField(
  input: EstimateInput,
  fieldPath: string,
): EstimateInput {
  if (!input.site.mapPlan?.appliedFields?.[fieldPath]) {
    return input;
  }

  const nextInput = structuredClone(input);
  if (nextInput.site.mapPlan?.appliedFields) {
    delete nextInput.site.mapPlan.appliedFields[fieldPath];
  }

  return nextInput;
}

'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  Building2,
  Cable,
  Check,
  CircleAlert,
  Layers3,
  LocateFixed,
  MapPinned,
  Move,
  Power,
  Route,
  Search,
  Shield,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Zap,
} from 'lucide-react';
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { LatLngLiteral } from 'leaflet';
import {
  buildAutoLabel,
  createEmptySiteMapPlan,
  normalizeSiteMapPlan,
} from '@/lib/estimate/map-plan';
import {
  MapCoordinate,
  MapFeatureType,
  SiteMapFeature,
  SiteMapLineFeature,
  SiteMapPlan,
  SiteMapPointFeature,
  SiteMapPolygonFeature,
} from '@/lib/estimate/types';

const DEFAULT_CENTER: MapCoordinate = { lat: 33.7488, lng: -84.3877 };

type PlannerTool = 'move' | MapFeatureType;

type AddressSearchResult = {
  address: string;
  location: MapCoordinate;
  state: string;
};

type ToolMeta = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  geometry: 'point' | 'line' | 'polygon';
  accent: string;
};

const TOOL_META: Record<MapFeatureType, ToolMeta> = {
  charger: {
    label: 'Charger',
    icon: Zap,
    description: 'Add a charger or stall location.',
    geometry: 'point',
    accent: '#7C3AED',
  },
  electrical_panel: {
    label: 'Electrical Panel',
    icon: Power,
    description: 'Pin the power source or panel location.',
    geometry: 'point',
    accent: '#2563EB',
  },
  mechanical_room: {
    label: 'Mechanical Room',
    icon: Building2,
    description: 'Mark the mechanical or equipment room.',
    geometry: 'point',
    accent: '#0F766E',
  },
  bollard: {
    label: 'Bollard',
    icon: Shield,
    description: 'Add protective bollard locations.',
    geometry: 'point',
    accent: '#D97706',
  },
  pad: {
    label: 'Pad',
    icon: Square,
    description: 'Mark a pad or equipment slab location.',
    geometry: 'point',
    accent: '#EA580C',
  },
  trench: {
    label: 'Trench Path',
    icon: Route,
    description: 'Draw trench routing so it can drive civil scope.',
    geometry: 'line',
    accent: '#EF4444',
  },
  conduit: {
    label: 'Conduit Path',
    icon: Cable,
    description: 'Draw conduit routing for electrical run planning.',
    geometry: 'line',
    accent: '#06B6D4',
  },
  restricted_zone: {
    label: 'Restricted Zone',
    icon: CircleAlert,
    description: 'Outline no-build areas or obstacles.',
    geometry: 'polygon',
    accent: '#F43F5E',
  },
  parking_zone: {
    label: 'Parking Zone',
    icon: Layers3,
    description: 'Outline the parking area tied to the installation.',
    geometry: 'polygon',
    accent: '#14B8A6',
  },
};

const TOOL_ORDER: MapFeatureType[] = [
  'charger',
  'electrical_panel',
  'mechanical_room',
  'bollard',
  'pad',
  'trench',
  'conduit',
  'restricted_zone',
  'parking_zone',
];

function latLngToCoordinate(point: LatLngLiteral): MapCoordinate {
  return { lat: point.lat, lng: point.lng };
}

function featureColor(type: MapFeatureType): string {
  return TOOL_META[type].accent;
}

function buildFeatureFromPoint(
  type: MapFeatureType,
  coordinates: MapCoordinate,
  features: SiteMapFeature[],
): SiteMapPointFeature {
  return {
    id: crypto.randomUUID(),
    type,
    label: buildAutoLabel(features, type),
    geometryType: 'Point',
    coordinates,
    createdAt: new Date().toISOString(),
  };
}

function buildFeatureFromLine(
  type: MapFeatureType,
  coordinates: MapCoordinate[],
  features: SiteMapFeature[],
): SiteMapLineFeature {
  return {
    id: crypto.randomUUID(),
    type,
    label: buildAutoLabel(features, type),
    geometryType: 'LineString',
    coordinates,
    lengthFt: 0,
    createdAt: new Date().toISOString(),
  };
}

function buildFeatureFromPolygon(
  type: MapFeatureType,
  coordinates: MapCoordinate[],
  features: SiteMapFeature[],
): SiteMapPolygonFeature {
  return {
    id: crypto.randomUUID(),
    type,
    label: buildAutoLabel(features, type),
    geometryType: 'Polygon',
    coordinates,
    areaSqFt: 0,
    createdAt: new Date().toISOString(),
  };
}

function MapViewport({
  center,
  zoom,
}: {
  center: MapCoordinate;
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: true });
  }, [center.lat, center.lng, map, zoom]);

  return null;
}

function MapInteractions({
  activeTool,
  onPoint,
  onDraftPoint,
}: {
  activeTool: PlannerTool;
  onPoint: (point: LatLngLiteral) => void;
  onDraftPoint: (point: LatLngLiteral) => void;
}) {
  useMapEvents({
    click(event) {
      if (activeTool === 'move') return;

      const geometry = TOOL_META[activeTool].geometry;
      if (geometry === 'point') {
        onPoint(event.latlng);
        return;
      }

      onDraftPoint(event.latlng);
    },
  });

  return null;
}

export function SitePlanner({
  address,
  value,
  onChange,
  onAddressResolved,
}: {
  address: string;
  value: SiteMapPlan | null | undefined;
  onChange: (plan: SiteMapPlan) => void;
  onAddressResolved: (result: AddressSearchResult) => void;
}) {
  const plan = useMemo(
    () => normalizeSiteMapPlan(value ?? createEmptySiteMapPlan(DEFAULT_CENTER)),
    [value],
  );
  const [searchQuery, setSearchQuery] = useState(address);
  const [activeTool, setActiveTool] = useState<PlannerTool>('move');
  const [draftPoints, setDraftPoints] = useState<MapCoordinate[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCenter = plan.center ?? DEFAULT_CENTER;
  const hasDraft = draftPoints.length > 0;
  const activeMeta = activeTool === 'move' ? null : TOOL_META[activeTool];

  const persistPlan = (nextPlan: SiteMapPlan) => {
    onChange(normalizeSiteMapPlan(nextPlan));
  };

  const addFeature = (feature: SiteMapFeature) => {
    persistPlan({
      ...plan,
      center: plan.center ?? DEFAULT_CENTER,
      features: [...plan.features, feature],
    });
  };

  const handleMapPoint = (latLng: LatLngLiteral) => {
    if (activeTool === 'move') return;

    const nextCoordinate = latLngToCoordinate(latLng);
    const geometry = TOOL_META[activeTool].geometry;

    if (geometry === 'point') {
      addFeature(buildFeatureFromPoint(activeTool, nextCoordinate, plan.features));
      return;
    }

    setDraftPoints((current) => [...current, nextCoordinate]);
  };

  const finishDraft = () => {
    if (activeTool === 'move' || draftPoints.length === 0) return;

    const geometry = TOOL_META[activeTool].geometry;
    if (geometry === 'line' && draftPoints.length >= 2) {
      addFeature(buildFeatureFromLine(activeTool, draftPoints, plan.features));
      setDraftPoints([]);
      return;
    }

    if (geometry === 'polygon' && draftPoints.length >= 3) {
      addFeature(buildFeatureFromPolygon(activeTool, draftPoints, plan.features));
      setDraftPoints([]);
    }
  };

  const removeSelectedFeature = () => {
    if (!selectedFeatureId) return;

    persistPlan({
      ...plan,
      features: plan.features.filter((feature) => feature.id !== selectedFeatureId),
    });
    setSelectedFeatureId(null);
  };

  const clearAllFeatures = () => {
    persistPlan({
      ...plan,
      features: [],
    });
    setSelectedFeatureId(null);
    setDraftPoints([]);
  };

  const handleLocateAddress = async () => {
    const query = searchQuery.trim() || address.trim();
    if (!query) {
      setError('Enter an address or place before searching the map.');
      return;
    }

    setError(null);
    setIsSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`,
      );
      const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
        address?: { state?: string };
      }>;

      if (!results[0]) {
        throw new Error('No locations matched that search.');
      }

      const first = results[0];
      const location = {
        lat: parseFloat(first.lat),
        lng: parseFloat(first.lon),
      };

      persistPlan({
        ...plan,
        center: location,
        zoom: 18,
      });

      onAddressResolved({
        address: first.display_name,
        location,
        state: first.address?.state ?? '',
      });
      setSearchQuery(first.display_name);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : 'Unable to search that address right now.',
      );
    } finally {
      setIsSearching(false);
    }
  };

  const selectedFeature = plan.features.find(
    (feature) => feature.id === selectedFeatureId,
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
      <section className="overflow-hidden rounded-[28px] border border-white/20 bg-slate-950/70 shadow-[0_24px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <div className="border-b border-white/10 bg-white/5 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
                Map & Layout Planner
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">
                Add construction features directly on a live map
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                {plan.summary.chargerCount} chargers
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                {plan.features.length} mapped features
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <MapPinned className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-200/80" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search project site address or landmark"
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 pl-10 pr-4 text-sm text-white outline-none ring-0 placeholder:text-slate-400 focus:border-cyan-300/60"
              />
            </div>
            <button
              type="button"
              onClick={handleLocateAddress}
              disabled={isSearching}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-400/15 px-5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              {isSearching ? 'Finding site...' : 'Locate on map'}
            </button>
          </div>

          {error && (
            <p className="mt-3 rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </p>
          )}
        </div>

        <div className="relative h-[560px]">
          <MapContainer
            center={[currentCenter.lat, currentCenter.lng]}
            zoom={plan.zoom}
            className="h-full w-full"
            doubleClickZoom={false}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewport center={currentCenter} zoom={plan.zoom} />
            <MapInteractions
              activeTool={activeTool}
              onPoint={handleMapPoint}
              onDraftPoint={handleMapPoint}
            />

            {plan.features.map((feature) => {
              const isSelected = feature.id === selectedFeatureId;
              const color = featureColor(feature.type);

              if (feature.geometryType === 'Point') {
                return (
                  <CircleMarker
                    key={feature.id}
                    center={[feature.coordinates.lat, feature.coordinates.lng]}
                    radius={isSelected ? 12 : 9}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: 0.85,
                      weight: isSelected ? 4 : 2,
                    }}
                    eventHandlers={{
                      click: () => setSelectedFeatureId(feature.id),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                      {feature.label}
                    </Tooltip>
                  </CircleMarker>
                );
              }

              if (feature.geometryType === 'LineString') {
                return (
                  <Polyline
                    key={feature.id}
                    positions={feature.coordinates.map((point) => [
                      point.lat,
                      point.lng,
                    ])}
                    pathOptions={{
                      color,
                      weight: isSelected ? 7 : 5,
                      opacity: 0.85,
                    }}
                    eventHandlers={{
                      click: () => setSelectedFeatureId(feature.id),
                    }}
                  >
                    <Tooltip sticky>{feature.label}</Tooltip>
                  </Polyline>
                );
              }

              return (
                <Polygon
                  key={feature.id}
                  positions={feature.coordinates.map((point) => [
                    point.lat,
                    point.lng,
                  ])}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.2,
                    weight: isSelected ? 5 : 3,
                  }}
                  eventHandlers={{
                    click: () => setSelectedFeatureId(feature.id),
                  }}
                >
                  <Tooltip sticky>{feature.label}</Tooltip>
                </Polygon>
              );
            })}

            {draftPoints.length >= 2 && activeMeta?.geometry === 'line' && (
              <Polyline
                positions={draftPoints.map((point) => [point.lat, point.lng])}
                pathOptions={{
                  color: activeMeta.accent,
                  dashArray: '10 8',
                  weight: 4,
                }}
              />
            )}

            {draftPoints.length >= 3 && activeMeta?.geometry === 'polygon' && (
              <Polygon
                positions={draftPoints.map((point) => [point.lat, point.lng])}
                pathOptions={{
                  color: activeMeta.accent,
                  fillColor: activeMeta.accent,
                  fillOpacity: 0.14,
                  dashArray: '10 8',
                  weight: 3,
                }}
              />
            )}
          </MapContainer>

          <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/15 bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-100 backdrop-blur">
            {activeTool === 'move'
              ? 'Pan and inspect'
              : `${activeMeta?.label}: ${activeMeta?.geometry === 'point' ? 'click to place' : 'click to add vertices'}`}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-[28px] border border-white/15 bg-white/70 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Drawing Tools
              </p>
              <h4 className="mt-1 text-lg font-semibold text-slate-900">
                Choose what you want to add
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTool('move');
                setDraftPoints([]);
              }}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${
                activeTool === 'move'
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              <Move className="h-4 w-4" />
              Move
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {TOOL_ORDER.map((tool) => {
              const Icon = TOOL_META[tool].icon;
              const isActive = activeTool === tool;

              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() => {
                    setActiveTool(tool);
                    setDraftPoints([]);
                  }}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                      : 'border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: isActive
                          ? 'rgba(255,255,255,0.14)'
                          : `${TOOL_META[tool].accent}18`,
                        color: isActive ? '#fff' : TOOL_META[tool].accent,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{TOOL_META[tool].label}</p>
                      <p
                        className={`mt-0.5 text-xs ${
                          isActive ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {TOOL_META[tool].description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {activeTool === 'move' ? (
              <div className="flex items-start gap-3">
                <LocateFixed className="mt-0.5 h-4 w-4 text-slate-500" />
                <p>
                  Use the map to inspect the site, then choose a tool to add
                  chargers, panels, trench runs, conduit, pads, bollards, and
                  restricted construction zones.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-cyan-600" />
                <p>
                  {activeMeta?.description} Changes apply to the estimate
                  automatically and drive quote highlights where relevant.
                </p>
              </div>
            )}
          </div>

          {hasDraft && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setDraftPoints((current) => current.slice(0, -1))
                }
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
              >
                <Undo2 className="h-4 w-4" />
                Undo Point
              </button>
              <button
                type="button"
                onClick={() => setDraftPoints([])}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
              >
                <Trash2 className="h-4 w-4" />
                Cancel Draft
              </button>
              <button
                type="button"
                onClick={finishDraft}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white"
              >
                <Check className="h-4 w-4" />
                Finish Drawing
              </button>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-white/15 bg-white/70 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Estimate Impact
          </p>
          <h4 className="mt-1 text-lg font-semibold text-slate-900">
            What posts into the quote
          </h4>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ['Charger count', plan.summary.chargerCount],
              ['Bollards', plan.summary.bollardCount],
              ['Pads', plan.summary.padCount],
              ['Trench ft', plan.summary.trenchLengthFt],
              ['Conduit ft', plan.summary.conduitLengthFt],
              ['Zones', plan.summary.restrictedZoneCount + plan.summary.parkingZoneCount],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {Object.entries(plan.appliedFields).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Draw map features to automatically populate estimate fields.
              </div>
            ) : (
              Object.entries(plan.appliedFields).map(([fieldPath, field]) => (
                <div
                  key={fieldPath}
                  className="rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                    {fieldPath}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {String(field.value)}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{field.reasoning}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/15 bg-white/70 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Feature List
              </p>
              <h4 className="mt-1 text-lg font-semibold text-slate-900">
                Current mapped scope
              </h4>
            </div>
            {plan.features.length > 0 && (
              <button
                type="button"
                onClick={clearAllFeatures}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </button>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {plan.features.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No map features yet. Start with the charger and electrical panel
                tools to build a fast site takeoff.
              </div>
            ) : (
              plan.features.map((feature) => {
                const Icon = TOOL_META[feature.type].icon;
                const isSelected = feature.id === selectedFeatureId;
                const metric =
                  feature.geometryType === 'LineString'
                    ? `${feature.lengthFt} ft`
                    : feature.geometryType === 'Polygon'
                      ? `${feature.areaSqFt.toLocaleString()} sq ft`
                      : 'Point';

                return (
                  <button
                    type="button"
                    key={feature.id}
                    onClick={() => setSelectedFeatureId(feature.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-2xl"
                          style={{
                            backgroundColor: isSelected
                              ? 'rgba(255,255,255,0.14)'
                              : `${TOOL_META[feature.type].accent}18`,
                            color: isSelected
                              ? '#fff'
                              : TOOL_META[feature.type].accent,
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{feature.label}</p>
                          <p
                            className={`mt-0.5 text-xs ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {metric}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedFeature && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Selected Feature
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {selectedFeature.label}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {TOOL_META[selectedFeature.type].description}
              </p>
              <button
                type="button"
                onClick={removeSelectedFeature}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700"
              >
                <Trash2 className="h-4 w-4" />
                Remove feature
              </button>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

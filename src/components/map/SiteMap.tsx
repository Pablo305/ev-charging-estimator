'use client';

import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { RunSegment, EquipmentPlacement, RunType, EquipmentType, PointToolType } from '@/lib/map/types';
import { RUN_TYPE_CONFIG, EQUIPMENT_TYPE_CONFIG } from '@/lib/map/constants';
import { measureRunLength } from '@/lib/map/measurements';
import { shouldRecenterViewport } from '@/lib/map/viewport-stability';
import { getEquipmentSvgHtml } from './EquipmentIcons';
import type { LineString, Point } from 'geojson';

interface SiteMapProps {
  siteCoordinates: [number, number] | null;
  runs: readonly RunSegment[];
  equipment: readonly EquipmentPlacement[];
  selectedTool: RunType | EquipmentType | PointToolType | null;
  selectedFeatureId: string | null;
  powerSourceLocation: [number, number] | null;
  chargerZones: readonly [number, number][];
  onRunCreate: (runType: RunType, geometry: LineString, lengthFt: number) => void;
  onRunUpdate: (id: string, geometry: LineString, lengthFt: number) => void;
  onRunDelete: (id: string) => void;
  onEquipmentPlace: (equipmentType: EquipmentType, geometry: Point) => void;
  onEquipmentUpdate: (id: string, geometry: Point) => void;
  onEquipmentDelete: (id: string) => void;
  onFeatureSelect: (id: string | null) => void;
  onPointToolPlace: (toolType: PointToolType, coordinates: [number, number]) => void;
  /** Called with the Mapbox map instance once fully loaded (for snapshot capture) */
  onMapReady?: (map: mapboxgl.Map) => void;
}

const EQUIPMENT_TYPES = new Set<string>(Object.keys(EQUIPMENT_TYPE_CONFIG));
const POINT_TOOL_TYPES = new Set<string>(['power_source', 'charger_zone']);

// Time window (ms) to suppress click events that are part of a double-click
const DBLCLICK_THRESHOLD_MS = 300;

function buildRunFeatureCollection(
  runs: readonly RunSegment[],
  override?: { id: string; geometry: LineString },
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: runs.map((run) => ({
      type: 'Feature' as const,
      properties: { id: run.id, runType: run.runType, lengthFt: run.lengthFt },
      geometry: override?.id === run.id ? override.geometry : run.geometry,
    })),
  };
}

function buildRunLabelFeatureCollection(runs: readonly RunSegment[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: runs.map((run) => {
      const coords = run.geometry.coordinates;
      const midIdx = Math.floor(coords.length / 2);
      return {
        type: 'Feature' as const,
        properties: { label: `${Math.round(run.lengthFt)} ft` },
        geometry: { type: 'Point' as const, coordinates: coords[midIdx] ?? coords[0] },
      };
    }),
  };
}

function updateRunSelectionStyles(map: mapboxgl.Map, selectedFeatureId: string | null) {
  const selectedId = selectedFeatureId ?? '';

  for (const runType of Object.keys(RUN_TYPE_CONFIG)) {
    const layerId = `runs-${runType}`;
    if (!map.getLayer(layerId)) continue;

    map.setPaintProperty(layerId, 'line-width', [
      'case',
      ['==', ['get', 'id'], selectedId],
      6,
      4,
    ]);
    map.setPaintProperty(layerId, 'line-opacity', [
      'case',
      ['==', ['get', 'id'], selectedId],
      1,
      0.85,
    ]);
  }
}

function syncEquipmentMarkerStyle(
  element: HTMLDivElement,
  {
    selected,
    draggable,
    hovered,
  }: {
    selected: boolean;
    draggable: boolean;
    hovered: boolean;
  },
) {
  const badge = element.querySelector<HTMLDivElement>('[data-role="badge"]');
  const scale = hovered ? 1.12 : selected ? 1.05 : 1;

  element.style.cursor = draggable ? 'grab' : 'pointer';
  element.style.zIndex = selected ? '15' : hovered ? '14' : '10';

  if (badge) {
    badge.style.transform = `scale(${scale})`;
    badge.style.border = selected ? '2px solid #1D4ED8' : '1.5px solid #2563EB';
    badge.style.boxShadow = selected
      ? '0 6px 18px rgba(15,23,42,0.35)'
      : hovered
        ? '0 4px 14px rgba(37,99,235,0.25)'
        : '0 2px 8px rgba(15,15,15,0.22)';
  }
}

function translateLineString(
  geometry: LineString,
  deltaLng: number,
  deltaLat: number,
): LineString {
  return {
    type: 'LineString',
    coordinates: geometry.coordinates.map(([lng, lat]) => [lng + deltaLng, lat + deltaLat]),
  };
}

function getFeatureId(event: mapboxgl.MapLayerMouseEvent): string | null {
  const id = event.features?.[0]?.properties?.id;
  return typeof id === 'string' ? id : null;
}

export function SiteMap({
  siteCoordinates,
  runs,
  equipment,
  selectedTool,
  selectedFeatureId,
  powerSourceLocation,
  chargerZones,
  onRunCreate,
  onRunUpdate,
  onEquipmentPlace,
  onEquipmentUpdate,
  onEquipmentDelete,
  onRunDelete,
  onFeatureSelect,
  onPointToolPlace,
  onMapReady,
}: SiteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const styleLoadedRef = useRef(false);

  // Track the last set of coordinates we auto-centered on, by VALUE not reference.
  // setDeep in EstimateContext uses JSON.parse(JSON.stringify(...)) which creates
  // new array references for siteCoordinates on every unrelated updateField call
  // (e.g. chargerCountFromMap). Without value-comparison, every marker placement
  // would re-fire flyTo and yank the viewport back to the geocoded center.
  const lastCenteredCoordsRef = useRef<[number, number] | null>(null);

  // Drawing state — all in a single ref to avoid stale closures
  const drawRef = useRef<{
    points: [number, number][];
    clickTimer: ReturnType<typeof setTimeout> | null;
    pendingClick: [number, number] | null;
  }>({ points: [], clickTimer: null, pendingClick: null });

  // Keep latest props in refs so map event handlers always see current values
  const selectedToolRef = useRef(selectedTool);
  selectedToolRef.current = selectedTool;

  const onRunCreateRef = useRef(onRunCreate);
  onRunCreateRef.current = onRunCreate;

  const onRunUpdateRef = useRef(onRunUpdate);
  onRunUpdateRef.current = onRunUpdate;

  const onRunDeleteRef = useRef(onRunDelete);
  onRunDeleteRef.current = onRunDelete;

  const onEquipmentPlaceRef = useRef(onEquipmentPlace);
  onEquipmentPlaceRef.current = onEquipmentPlace;

  const onEquipmentUpdateRef = useRef(onEquipmentUpdate);
  onEquipmentUpdateRef.current = onEquipmentUpdate;

  const onEquipmentDeleteRef = useRef(onEquipmentDelete);
  onEquipmentDeleteRef.current = onEquipmentDelete;

  const onFeatureSelectRef = useRef(onFeatureSelect);
  onFeatureSelectRef.current = onFeatureSelect;

  const onPointToolPlaceRef = useRef(onPointToolPlace);
  onPointToolPlaceRef.current = onPointToolPlace;

  const runsRef = useRef(runs);
  runsRef.current = runs;

  const selectedFeatureIdRef = useRef(selectedFeatureId);
  selectedFeatureIdRef.current = selectedFeatureId;

  const runDragRef = useRef<{
    id: string;
    startLngLat: [number, number];
    originalGeometry: LineString;
    hasMoved: boolean;
  } | null>(null);

  // Refs for point tool markers
  const powerSourceMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const chargerZoneMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // ── Helper: clear temp drawing visuals ──
  function clearDrawingVisuals(map: mapboxgl.Map) {
    const tempLine = map.getSource('drawing-temp') as mapboxgl.GeoJSONSource | undefined;
    const tempVerts = map.getSource('drawing-vertices') as mapboxgl.GeoJSONSource | undefined;
    if (tempLine) tempLine.setData({ type: 'FeatureCollection', features: [] });
    if (tempVerts) tempVerts.setData({ type: 'FeatureCollection', features: [] });
  }

  // ── Helper: update temp drawing visuals from current points ──
  function updateDrawingVisuals(map: mapboxgl.Map, points: [number, number][], cursor?: [number, number]) {
    // Temp line (solid segments + dashed rubber-band to cursor)
    const tempLine = map.getSource('drawing-temp') as mapboxgl.GeoJSONSource | undefined;
    if (tempLine) {
      const features: GeoJSON.Feature[] = [];

      // Solid line through confirmed points
      if (points.length >= 2) {
        features.push({
          type: 'Feature',
          properties: { style: 'solid' },
          geometry: { type: 'LineString', coordinates: points },
        });
      }

      // Dashed rubber-band from last point to cursor
      if (points.length >= 1 && cursor) {
        features.push({
          type: 'Feature',
          properties: { style: 'dashed' },
          geometry: { type: 'LineString', coordinates: [points[points.length - 1], cursor] },
        });
      }

      tempLine.setData({ type: 'FeatureCollection', features });
    }

    // Vertex dots
    const tempVerts = map.getSource('drawing-vertices') as mapboxgl.GeoJSONSource | undefined;
    if (tempVerts) {
      const vertFeatures = points.map((coord, i) => ({
        type: 'Feature' as const,
        properties: { index: i },
        geometry: { type: 'Point' as const, coordinates: coord },
      }));
      tempVerts.setData({ type: 'FeatureCollection', features: vertFeatures });
    }
  }

  function setRunSources(
    map: mapboxgl.Map,
    runData: readonly RunSegment[],
    override?: { id: string; geometry: LineString },
  ) {
    const source = map.getSource('runs') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(buildRunFeatureCollection(runData, override));
    }

    const labelSource = map.getSource('run-labels') as mapboxgl.GeoJSONSource | undefined;
    if (labelSource) {
      labelSource.setData(
        buildRunLabelFeatureCollection(
          runData.map((run) =>
            override?.id === run.id ? { ...run, geometry: override.geometry } : run,
          ),
        ),
      );
    }
  }

  // ── Initialize map (once) ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

    const initialCenter = siteCoordinates ?? [-80.1918, 25.7617];
    const initialZoom = siteCoordinates ? 18 : 12;

    // Seed the value-tracker so the flyTo effect doesn't re-fly to the same
    // coordinates right after initial mount (the map is already centered here).
    if (siteCoordinates) {
      lastCenteredCoordsRef.current = [siteCoordinates[0], siteCoordinates[1]];
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
      doubleClickZoom: false, // We handle dblclick ourselves
    });

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    map.on('load', () => {
      styleLoadedRef.current = true;
      // Expose map instance for snapshot capture
      if (onMapReady) onMapReady(map);

      // ── Committed run lines ──
      map.addSource('runs', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      for (const [runType, config] of Object.entries(RUN_TYPE_CONFIG)) {
        map.addLayer({
          id: `runs-${runType}`,
          type: 'line',
          source: 'runs',
          filter: ['==', ['get', 'runType'], runType],
          paint: {
            'line-color': config.color,
            'line-width': 4,
            'line-opacity': 0.85,
          },
          layout: { 'line-cap': 'round', 'line-join': 'round' },
        });
      }

      updateRunSelectionStyles(map, selectedFeatureIdRef.current);

      // ── Drawing temp line (solid confirmed + dashed rubber-band) ──
      map.addSource('drawing-temp', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Solid segments (confirmed clicks)
      map.addLayer({
        id: 'drawing-temp-solid',
        type: 'line',
        source: 'drawing-temp',
        filter: ['==', ['get', 'style'], 'solid'],
        paint: {
          'line-color': '#3B82F6',
          'line-width': 3,
          'line-opacity': 0.9,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });

      // Dashed rubber-band (last point → cursor)
      map.addLayer({
        id: 'drawing-temp-dashed',
        type: 'line',
        source: 'drawing-temp',
        filter: ['==', ['get', 'style'], 'dashed'],
        paint: {
          'line-color': '#3B82F6',
          'line-width': 2,
          'line-dasharray': [3, 3],
          'line-opacity': 0.6,
        },
      });

      // ── Drawing vertex dots ──
      map.addSource('drawing-vertices', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'drawing-vertices-layer',
        type: 'circle',
        source: 'drawing-vertices',
        paint: {
          'circle-radius': 5,
          'circle-color': '#FFFFFF',
          'circle-stroke-color': '#3B82F6',
          'circle-stroke-width': 2,
        },
      });

      // ── Measurement labels ──
      map.addSource('run-labels', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'run-labels-layer',
        type: 'symbol',
        source: 'run-labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-offset': [0, -1],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#FFFFFF',
          'text-halo-color': '#000000',
          'text-halo-width': 1.5,
        },
      });

      for (const runType of Object.keys(RUN_TYPE_CONFIG)) {
        const layerId = `runs-${runType}`;

        map.on('mouseenter', layerId, () => {
          if (!selectedToolRef.current && !runDragRef.current) {
            map.getCanvas().style.cursor = 'pointer';
          }
        });

        map.on('mouseleave', layerId, () => {
          if (!selectedToolRef.current && !runDragRef.current) {
            map.getCanvas().style.cursor = '';
          }
        });

        map.on('click', layerId, (e) => {
          if (selectedToolRef.current) return;

          const featureId = getFeatureId(e);
          if (!featureId) return;

          e.preventDefault();
          e.originalEvent.stopPropagation();
          onFeatureSelectRef.current(featureId);
        });

        map.on('contextmenu', layerId, (e) => {
          if (selectedToolRef.current) return;

          const featureId = getFeatureId(e);
          if (!featureId) return;

          e.preventDefault();
          e.originalEvent.stopPropagation();
          onFeatureSelectRef.current(null);
          onRunDeleteRef.current(featureId);
        });

        map.on('mousedown', layerId, (e) => {
          if (selectedToolRef.current) return;

          const featureId = getFeatureId(e);
          if (!featureId || selectedFeatureIdRef.current !== featureId) return;

          const run = runsRef.current.find((candidate) => candidate.id === featureId);
          if (!run) return;

          e.preventDefault();
          e.originalEvent.stopPropagation();
          map.dragPan.disable();
          map.getCanvas().style.cursor = 'grabbing';
          runDragRef.current = {
            id: featureId,
            startLngLat: [e.lngLat.lng, e.lngLat.lat],
            originalGeometry: run.geometry,
            hasMoved: false,
          };
        });
      }
    });

    // ── Click handler (delayed to distinguish from dblclick) ──
    map.on('click', (e: mapboxgl.MapMouseEvent) => {
      const tool = selectedToolRef.current;
      if (!tool) {
        if (!runDragRef.current) {
          onFeatureSelectRef.current(null);
        }
        return;
      }

      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      // Point tool placement (power source / charger zone) — instant
      if (POINT_TOOL_TYPES.has(tool)) {
        onPointToolPlaceRef.current(tool as PointToolType, lngLat);
        return;
      }

      // Equipment placement — instant, no dblclick ambiguity
      if (EQUIPMENT_TYPES.has(tool)) {
        const point: Point = { type: 'Point', coordinates: lngLat };
        onEquipmentPlaceRef.current(tool as EquipmentType, point);
        return;
      }

      // Run drawing — delay click to distinguish from dblclick
      const draw = drawRef.current;
      if (draw.clickTimer) clearTimeout(draw.clickTimer);
      draw.pendingClick = lngLat;

      draw.clickTimer = setTimeout(() => {
        // This fires only if no dblclick happened within the threshold
        if (draw.pendingClick) {
          draw.points = [...draw.points, draw.pendingClick];
          draw.pendingClick = null;
          updateDrawingVisuals(map, draw.points);
        }
      }, DBLCLICK_THRESHOLD_MS);
    });

    // ── Double-click handler (finalize run) ──
    map.on('dblclick', (e: mapboxgl.MapMouseEvent) => {
      const tool = selectedToolRef.current;
      if (!tool || EQUIPMENT_TYPES.has(tool) || POINT_TOOL_TYPES.has(tool)) return;

      e.preventDefault();
      const draw = drawRef.current;

      // Cancel the pending single-click so the last point isn't added twice
      if (draw.clickTimer) {
        clearTimeout(draw.clickTimer);
        draw.clickTimer = null;
      }

      // Add the final point from the dblclick location (once)
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      draw.points = [...draw.points, lngLat];
      draw.pendingClick = null;

      if (draw.points.length < 2) {
        draw.points = [];
        clearDrawingVisuals(map);
        return;
      }

      const geometry: LineString = {
        type: 'LineString',
        coordinates: [...draw.points],
      };
      const lengthFt = measureRunLength(geometry);

      onRunCreateRef.current(tool as RunType, geometry, lengthFt);

      // Reset drawing state
      draw.points = [];
      clearDrawingVisuals(map);
    });

    // ── Mouse move for rubber-band line ──
    map.on('mousemove', (e: mapboxgl.MapMouseEvent) => {
      const runDrag = runDragRef.current;
      if (runDrag) {
        const deltaLng = e.lngLat.lng - runDrag.startLngLat[0];
        const deltaLat = e.lngLat.lat - runDrag.startLngLat[1];
        if (deltaLng !== 0 || deltaLat !== 0) {
          runDrag.hasMoved = true;
        }

        setRunSources(map, runsRef.current, {
          id: runDrag.id,
          geometry: translateLineString(runDrag.originalGeometry, deltaLng, deltaLat),
        });
        return;
      }

      const tool = selectedToolRef.current;
      if (!tool || EQUIPMENT_TYPES.has(tool) || POINT_TOOL_TYPES.has(tool)) return;

      const draw = drawRef.current;
      if (draw.points.length === 0) return;

      const cursor: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      updateDrawingVisuals(map, draw.points, cursor);
    });

    map.on('mouseup', (e: mapboxgl.MapMouseEvent) => {
      const runDrag = runDragRef.current;
      if (!runDrag) return;

      runDragRef.current = null;
      map.dragPan.enable();
      map.getCanvas().style.cursor = '';

      if (!runDrag.hasMoved) return;

      const deltaLng = e.lngLat.lng - runDrag.startLngLat[0];
      const deltaLat = e.lngLat.lat - runDrag.startLngLat[1];
      const geometry = translateLineString(runDrag.originalGeometry, deltaLng, deltaLat);
      const lengthFt = measureRunLength(geometry);
      onRunUpdateRef.current(runDrag.id, geometry, lengthFt);
    });

    // ── Right-click to cancel drawing ──
    map.on('contextmenu', (e: mapboxgl.MapMouseEvent) => {
      const draw = drawRef.current;
      if (draw.points.length > 0) {
        e.preventDefault();
        draw.points = [];
        draw.pendingClick = null;
        if (draw.clickTimer) {
          clearTimeout(draw.clickTimer);
          draw.clickTimer = null;
        }
        clearDrawingVisuals(map);
      }
    });

    mapRef.current = map;

    return () => {
      styleLoadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fly to coordinates when a NEW address is geocoded ──
  //
  // BUG FIX: previous implementation fired flyTo on every siteCoordinates
  // reference change. Because EstimateContext's setDeep uses
  // JSON.parse(JSON.stringify(state)), ANY updateField call (e.g.
  // chargerCountFromMap, hasPanelPlaced triggered by the auto-calc effect in
  // InlineMapPrompt) creates a new siteCoordinates array reference even
  // though the lat/lng values haven't changed. That caused the map to
  // re-center and re-zoom every time a charger was placed, forcing users to
  // repeatedly adjust their view.
  //
  // Fix: compare by VALUE, not reference. Only fly when the numeric
  // coordinates actually differ from the last centered position.
  useEffect(() => {
    if (!mapRef.current || !siteCoordinates) return;

    if (!shouldRecenterViewport(lastCenteredCoordsRef.current, siteCoordinates)) {
      return;
    }

    lastCenteredCoordsRef.current = [siteCoordinates[0], siteCoordinates[1]];
    mapRef.current.flyTo({ center: siteCoordinates, zoom: 18, duration: 1500 });
  }, [siteCoordinates]);

  // ── Sync committed runs to map layers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const doUpdate = () => {
      setRunSources(map, runs);
    };

    if (styleLoadedRef.current) {
      doUpdate();
    } else {
      // Queue update for after style loads
      map.once('load', doUpdate);
    }
  }, [runs]);

  // ── Highlight selected runs ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const doUpdate = () => {
      updateRunSelectionStyles(map, selectedFeatureId);
    };

    if (styleLoadedRef.current) {
      doUpdate();
    } else {
      map.once('load', doUpdate);
    }
  }, [selectedFeatureId]);

  // ── Sync equipment markers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(equipment.map((e) => e.id));

    // Remove stale markers
    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Add new markers
    for (const eq of equipment) {
      let marker = markersRef.current.get(eq.id);

      if (!marker) {
        const el = document.createElement('div');
        el.className = 'map-equipment-marker';

        const badge = document.createElement('div');
        badge.className = 'map-equipment-marker__badge';
        badge.dataset.role = 'badge';

        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'map-equipment-marker__icon';
        iconWrapper.dataset.role = 'icon';
        badge.appendChild(iconWrapper);

        const label = document.createElement('div');
        label.className = 'map-equipment-marker__label';
        label.dataset.role = 'label';

        const pointer = document.createElement('div');
        pointer.className = 'map-equipment-marker__pointer';

        el.appendChild(badge);
        el.appendChild(label);
        el.appendChild(pointer);

        el.addEventListener('mouseenter', () => {
          el.dataset.hovered = 'true';
          syncEquipmentMarkerStyle(el, {
            selected: el.dataset.selected === 'true',
            draggable: el.dataset.draggable === 'true',
            hovered: true,
          });
        });

        el.addEventListener('mouseleave', () => {
          el.dataset.hovered = 'false';
          syncEquipmentMarkerStyle(el, {
            selected: el.dataset.selected === 'true',
            draggable: el.dataset.draggable === 'true',
            hovered: false,
          });
        });

        el.addEventListener('contextmenu', (ev) => {
          ev.preventDefault();
          onFeatureSelectRef.current(null);
          onEquipmentDeleteRef.current(eq.id);
        });

        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onFeatureSelectRef.current(eq.id);
        });

        marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
          offset: [0, -6],
          draggable: false,
          pitchAlignment: 'map',
          rotationAlignment: 'map',
        })
          .setLngLat(eq.geometry.coordinates as [number, number])
          .addTo(map);

        marker.on('dragstart', () => {
          el.style.cursor = 'grabbing';
        });

        marker.on('dragend', () => {
          const lngLat = marker?.getLngLat();
          if (!lngLat) return;

          syncEquipmentMarkerStyle(el, {
            selected: el.dataset.selected === 'true',
            draggable: el.dataset.draggable === 'true',
            hovered: el.dataset.hovered === 'true',
          });
          onEquipmentUpdateRef.current(eq.id, {
            type: 'Point',
            coordinates: [lngLat.lng, lngLat.lat],
          });
        });

        markersRef.current.set(eq.id, marker);
      }

      const config = EQUIPMENT_TYPE_CONFIG[eq.equipmentType];
      const element = marker.getElement() as HTMLDivElement;
      const isSelected = selectedFeatureId === eq.id;
      const isDraggable = isSelected && selectedTool === null;

      const iconContainer = element.querySelector<HTMLDivElement>('[data-role="icon"]');
      const labelEl = element.querySelector<HTMLDivElement>('[data-role="label"]');
      if (iconContainer) {
        iconContainer.innerHTML = getEquipmentSvgHtml(eq.equipmentType, 26);
      }
      if (labelEl) {
        labelEl.textContent = eq.label;
      }
      element.title = `${config.label}: ${eq.label}`;
      element.dataset.selected = String(isSelected);
      element.dataset.draggable = String(isDraggable);
      element.dataset.hovered = element.dataset.hovered ?? 'false';

      marker
        .setLngLat(eq.geometry.coordinates as [number, number])
        .setDraggable(isDraggable);

      syncEquipmentMarkerStyle(element, {
        selected: isSelected,
        draggable: isDraggable,
        hovered: element.dataset.hovered === 'true',
      });
    }
  }, [equipment, selectedFeatureId, selectedTool]);

  // ── Update drawing line color when tool changes ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;

    if (selectedTool && !EQUIPMENT_TYPES.has(selectedTool)) {
      const config = RUN_TYPE_CONFIG[selectedTool as RunType];
      if (config) {
        map.setPaintProperty('drawing-temp-solid', 'line-color', config.color);
        map.setPaintProperty('drawing-temp-dashed', 'line-color', config.color);
        map.setPaintProperty('drawing-vertices-layer', 'circle-stroke-color', config.color);
      }
    }
  }, [selectedTool]);

  // ── Clear drawing state when tool changes ──
  useEffect(() => {
    const draw = drawRef.current;
    draw.points = [];
    draw.pendingClick = null;
    if (draw.clickTimer) {
      clearTimeout(draw.clickTimer);
      draw.clickTimer = null;
    }

    const map = mapRef.current;
    if (map && styleLoadedRef.current) {
      clearDrawingVisuals(map);
    }
  }, [selectedTool]);

  // ── Power source marker ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old marker
    if (powerSourceMarkerRef.current) {
      powerSourceMarkerRef.current.remove();
      powerSourceMarkerRef.current = null;
    }

    if (powerSourceLocation) {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 40px; height: 40px; border-radius: 50%;
        background: #DC2626; border: 3px solid #FFF;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; cursor: pointer; box-shadow: 0 2px 8px rgba(220,38,38,0.5);
      `;
      el.textContent = '\u26A1';
      el.title = 'Power Source';

      powerSourceMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center', offset: [0, 0] })
        .setLngLat(powerSourceLocation)
        .addTo(map);
    }
  }, [powerSourceLocation]);

  // ── Charger zone markers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    for (const marker of chargerZoneMarkersRef.current) {
      marker.remove();
    }
    chargerZoneMarkersRef.current = [];

    for (let i = 0; i < chargerZones.length; i++) {
      const coord = chargerZones[i];
      const el = document.createElement('div');
      el.style.cssText = `
        width: 32px; height: 32px; border-radius: 50%;
        background: #2563EB; border: 2px solid #FFF;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: bold; color: white;
        cursor: pointer; box-shadow: 0 2px 6px rgba(37,99,235,0.5);
        animation: pulse 2s infinite;
      `;
      el.textContent = String(i + 1);
      el.title = `Charger Zone ${i + 1}`;

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center', offset: [0, 0] })
        .setLngLat(coord)
        .addTo(map);

      chargerZoneMarkersRef.current.push(marker);
    }
  }, [chargerZones]);

  // ── Cursor style ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = selectedTool ? 'crosshair' : '';
  }, [selectedTool]);

  return (
    <div ref={containerRef} className="h-full w-full" />
  );
}

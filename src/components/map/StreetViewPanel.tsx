'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Loader, importLibrary, setOptions } from '@googlemaps/js-api-loader';
import type { EquipmentPlacement } from '@/lib/map/types';
import { EQUIPMENT_TYPE_CONFIG } from '@/lib/map/constants';

interface StreetViewPanelProps {
  coordinates: [number, number] | null; // [lng, lat]
  equipment: readonly EquipmentPlacement[];
  onAnalyze: (imageDataUrl: string) => void;
  isAnalyzing: boolean;
  /** Hide AI / render / download controls (shared estimate view). */
  readOnly?: boolean;
}

export function StreetViewPanel({
  coordinates,
  equipment,
  onAnalyze,
  isAnalyzing,
  readOnly = false,
}: StreetViewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'no-coverage' | 'no-key'>('loading');
  const [heading, setHeading] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [renderMode, setRenderMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize Google Maps + Street View
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) {
      setStatus('no-key');
      return;
    }
    if (!containerRef.current || !coordinates) return;

    setOptions({ key: apiKey, v: 'weekly' });

    let panorama: google.maps.StreetViewPanorama | null = null;

    importLibrary('streetView')
      .then(() => {
        if (!containerRef.current) return;

        // Google uses [lat, lng], we store [lng, lat]
        const latLng = { lat: coordinates[1], lng: coordinates[0] };

        // Check Street View coverage first
        const sv = new google.maps.StreetViewService();
        sv.getPanorama(
          { location: latLng, radius: 100, preference: google.maps.StreetViewPreference.NEAREST },
          (data, svStatus) => {
            if (svStatus !== google.maps.StreetViewStatus.OK || !data?.location?.latLng) {
              setStatus('no-coverage');
              return;
            }

            panorama = new google.maps.StreetViewPanorama(containerRef.current!, {
              position: data.location.latLng,
              pov: { heading: 0, pitch: 0 },
              zoom: 1,
              addressControl: false,
              showRoadLabels: false,
              motionTracking: false,
              motionTrackingControl: false,
            });

            panorama.addListener('pov_changed', () => {
              if (!panorama) return;
              const pov = panorama.getPov();
              setHeading(Math.round(pov.heading));
              setPitch(Math.round(pov.pitch));
            });

            panoramaRef.current = panorama;
            setStatus('ready');
          },
        );
      })
      .catch(() => {
        setStatus('no-coverage');
      });

    return () => {
      panoramaRef.current = null;
    };
  }, [coordinates]);

  // Capture current Street View frame for AI analysis
  const handleCapture = useCallback(() => {
    if (!coordinates) return;

    // Use Street View Static API for a clean capture
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) return;

    const lat = coordinates[1];
    const lng = coordinates[0];
    const url = `https://maps.googleapis.com/maps/api/streetview?size=800x600&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=90&key=${apiKey}`;

    onAnalyze(url);
  }, [coordinates, heading, pitch, onAnalyze]);

  // Render overlay: draw equipment markers on a canvas over Street View
  const handleRenderCapture = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !coordinates) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const container = containerRef.current;
    if (!container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw equipment markers as overlay
    // Place them in a reasonable spread across the bottom third of the view
    const chargers = equipment.filter(
      (e) => e.equipmentType === 'charger_l2' || e.equipmentType === 'charger_l3',
    );

    if (chargers.length === 0) return;

    const startX = canvas.width * 0.2;
    const endX = canvas.width * 0.8;
    const y = canvas.height * 0.7;
    const spacing = chargers.length > 1 ? (endX - startX) / (chargers.length - 1) : 0;

    chargers.forEach((eq, i) => {
      const x = chargers.length === 1 ? canvas.width / 2 : startX + spacing * i;
      const config = EQUIPMENT_TYPE_CONFIG[eq.equipmentType];
      const isL3 = eq.equipmentType === 'charger_l3';

      if (isL3) {
        // L3 DCFC Supercharger — tall pedestal with screen and cable holster
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(x - 6, y - 75, 12, 75);

        ctx.fillStyle = '#1E3A5F';
        ctx.beginPath();
        ctx.roundRect(x - 20, y - 95, 40, 30, 4);
        ctx.fill();

        ctx.fillStyle = '#60A5FA';
        ctx.fillRect(x - 14, y - 91, 28, 18);

        // Lightning bolt on screen
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 4, y - 90);
        ctx.lineTo(x - 2, y - 82);
        ctx.lineTo(x + 4, y - 82);
        ctx.lineTo(x - 2, y - 74);
        ctx.stroke();

        // Cable holster on right side
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 20, y - 70);
        ctx.quadraticCurveTo(x + 30, y - 60, x + 20, y - 50);
        ctx.stroke();

        // Connector nozzle
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.roundRect(x + 17, y - 52, 8, 5, 2);
        ctx.fill();

        // Base pad
        ctx.fillStyle = '#374151';
        ctx.fillRect(x - 14, y, 28, 4);
      } else {
        // L2 Wall Charger — compact box with cable and plug
        ctx.fillStyle = '#64748B';
        ctx.fillRect(x - 16, y - 58, 32, 3);

        ctx.fillStyle = '#2563EB';
        ctx.beginPath();
        ctx.roundRect(x - 14, y - 55, 28, 32, 3);
        ctx.fill();

        ctx.fillStyle = '#93C5FD';
        ctx.fillRect(x - 9, y - 50, 18, 10);

        // Green LED indicator
        ctx.fillStyle = '#34D399';
        ctx.beginPath();
        ctx.arc(x, y - 30, 3, 0, Math.PI * 2);
        ctx.fill();

        // Cable hanging down
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 23);
        ctx.quadraticCurveTo(x + 8, y - 10, x + 6, y);
        ctx.stroke();

        // Plug connector
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.arc(x + 6, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#93C5FD';
        ctx.beginPath();
        ctx.arc(x + 6, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(config.label, x, isL3 ? y - 98 : y - 62);

      ctx.fillStyle = '#1E3A5F';
      ctx.font = '10px system-ui';
      ctx.fillText(eq.label, x, y + 14);
    });

    // Draw "PROPOSED" watermark
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#2563EB';
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-0.3);
    ctx.fillText('PROPOSED LAYOUT', 0, 0);
    ctx.restore();

    // Add legend box
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(10, canvas.height - 70, 200, 60);
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, canvas.height - 70, 200, 60);

    ctx.fillStyle = '#1E3A5F';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('BulletEV Proposed Layout', 18, canvas.height - 52);
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#64748B';
    ctx.fillText(`${chargers.length} charger(s) shown`, 18, canvas.height - 38);
    ctx.fillText(`View: heading ${heading}°, pitch ${pitch}°`, 18, canvas.height - 24);
  }, [equipment, coordinates, heading, pitch]);

  // Update render overlay when render mode changes or view moves
  useEffect(() => {
    if (renderMode) {
      handleRenderCapture();
    }
  }, [renderMode, heading, pitch, handleRenderCapture]);

  // Download render as PNG
  const handleDownloadRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `bulletev-site-render-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  if (status === 'no-key') {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 p-6 text-center">
        <div>
          <div className="text-lg font-medium text-gray-600">Street View</div>
          <p className="mt-2 text-sm text-gray-400">
            Set NEXT_PUBLIC_GOOGLE_MAPS_KEY to enable Street View
          </p>
        </div>
      </div>
    );
  }

  if (!coordinates) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 p-6 text-center">
        <div>
          <div className="text-lg font-medium text-gray-600">Street View</div>
          <p className="mt-2 text-sm text-gray-400">
            Search for an address to load Street View
          </p>
        </div>
      </div>
    );
  }

  if (status === 'no-coverage') {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 p-6 text-center">
        <div>
          <div className="text-lg font-medium text-gray-600">No Street View Coverage</div>
          <p className="mt-2 text-sm text-gray-400">
            Google Street View is not available at this location
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Street View container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Render overlay canvas */}
      {renderMode && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-2">
        <div className="rounded bg-black/60 px-3 py-1.5 text-xs text-white">
          Heading: {heading}° | Pitch: {pitch}°
        </div>

        {!readOnly && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCapture}
              disabled={isAnalyzing || status !== 'ready'}
              className="rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
            >
              {isAnalyzing ? 'Analyzing...' : 'AI Analyze View'}
            </button>

            <button
              type="button"
              onClick={() => setRenderMode((v) => !v)}
              className={`rounded px-3 py-2 text-xs font-medium shadow ${
                renderMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {renderMode ? 'Hide Render' : 'Show Render'}
            </button>

            {renderMode && (
              <button
                type="button"
                onClick={handleDownloadRender}
                className="rounded bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow hover:bg-gray-100"
              >
                Download PNG
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

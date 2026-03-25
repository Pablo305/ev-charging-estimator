'use client';

import type { EquipmentPlacement, EquipmentType } from '@/lib/map/types';
import { EQUIPMENT_TYPE_CONFIG } from '@/lib/map/constants';
import { EquipmentIcon } from '@/components/map/EquipmentIcons';

function safeEquipmentType(t: string): EquipmentType {
  return t in EQUIPMENT_TYPE_CONFIG ? (t as EquipmentType) : 'charger_l2';
}

interface ConceptualSiteOverlayProps {
  equipment: readonly EquipmentPlacement[];
}

/**
 * Lightweight 2.5D-style conceptual visualization (not photorealistic 3D).
 * Uses map coordinates only to spread markers — clearly labeled as illustrative.
 */
export function ConceptualSiteOverlay({ equipment }: ConceptualSiteOverlayProps) {
  if (equipment.length === 0) return null;

  const coords = equipment.map((e) => e.geometry.coordinates as [number, number]);
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const pad = 1e-8;
  const spanLng = Math.max(maxLng - minLng, pad);
  const spanLat = Math.max(maxLat - minLat, pad);

  const toPct = (lng: number, lat: number) => ({
    left: `${((lng - minLng) / spanLng) * 70 + 15}%`,
    top: `${(1 - (lat - minLat) / spanLat) * 70 + 15}%`,
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Conceptual site layout</p>
      <p className="mt-1 text-[0.6875rem] text-slate-500">
        2.5D-style illustration from map placements — not to scale; for discussion only.
      </p>
      <div
        className="relative mx-auto mt-4 aspect-[16/9] max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-slate-200/80 shadow-inner"
        style={{ perspective: '900px' }}
      >
        <div
          className="absolute inset-[12%] rounded-md bg-gradient-to-br from-emerald-900/20 to-slate-600/30"
          style={{
            transform: 'rotateX(58deg) rotateZ(-8deg)',
            transformStyle: 'preserve-3d',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.15)',
          }}
        />
        {equipment.map((eq, i) => {
          const [lng, lat] = eq.geometry.coordinates as [number, number];
          const { left, top } = toPct(lng, lat);
          return (
            <div
              key={eq.id || i}
              className="absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-white bg-white/95 p-0.5 shadow-md ring-1 ring-slate-300/80"
              style={{ left, top }}
              title={eq.label}
            >
              <EquipmentIcon type={safeEquipmentType(eq.equipmentType)} size={28} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

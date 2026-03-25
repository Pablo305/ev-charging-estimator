'use client';

import type { EquipmentType } from '@/lib/map/types';

/**
 * Inline SVG icons for each equipment type. Designed to be recognizable
 * at small sizes on a satellite map and inside the compact toolbar.
 */

function L3SuperchargerIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Tall pedestal body */}
      <rect x="7" y="3" width="10" height="16" rx="2" fill="#1E3A5F" />
      {/* Screen */}
      <rect x="9" y="5" width="6" height="5" rx="1" fill="#60A5FA" />
      {/* Cable holster */}
      <path d="M17 14 C19 14, 19 17, 17 17" stroke="#F59E0B" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Connector nozzle */}
      <rect x="16.5" y="16.5" width="3" height="2" rx="0.5" fill="#F59E0B" />
      {/* Lightning bolt on screen */}
      <path d="M13 6 L11 9 L13 9 L11 12" stroke="#FDE047" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Base */}
      <rect x="6" y="19" width="12" height="2" rx="1" fill="#0F172A" />
    </svg>
  );
}

function L2ChargerIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Wall-mount box */}
      <rect x="6" y="4" width="12" height="14" rx="2" fill="#2563EB" />
      {/* Screen/indicator */}
      <rect x="8" y="6" width="8" height="4" rx="1" fill="#93C5FD" />
      {/* Cable coming out bottom */}
      <path d="M12 18 L12 20 C12 21, 14 21, 14 20 L14 19" stroke="#374151" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Plug connector */}
      <circle cx="14" cy="19" r="1.5" fill="#374151" />
      <circle cx="14" cy="19" r="0.5" fill="#93C5FD" />
      {/* LED indicator */}
      <circle cx="12" cy="12" r="1.5" fill="#34D399" />
      {/* Mount bracket */}
      <rect x="5" y="3" width="14" height="1.5" rx="0.5" fill="#64748B" />
    </svg>
  );
}

function TransformerIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Transformer box */}
      <rect x="4" y="6" width="16" height="12" rx="1" fill="#6B7280" />
      {/* Cooling fins */}
      <rect x="2" y="8" width="2" height="8" rx="0.5" fill="#9CA3AF" />
      <rect x="20" y="8" width="2" height="8" rx="0.5" fill="#9CA3AF" />
      {/* High voltage symbol */}
      <path d="M13 8 L11 12 L13 12 L11 16" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Bushings on top */}
      <circle cx="8" cy="5" r="1.5" fill="#DC2626" />
      <circle cx="16" cy="5" r="1.5" fill="#DC2626" />
      {/* Base pad */}
      <rect x="3" y="18" width="18" height="2" rx="0.5" fill="#374151" />
    </svg>
  );
}

function SwitchgearIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Cabinet */}
      <rect x="4" y="3" width="16" height="18" rx="1" fill="#4B5563" />
      {/* Door line */}
      <line x1="12" y1="4" x2="12" y2="20" stroke="#374151" strokeWidth="0.5" />
      {/* Breaker rows */}
      <rect x="6" y="6" width="4" height="2" rx="0.5" fill="#1F2937" />
      <rect x="6" y="10" width="4" height="2" rx="0.5" fill="#1F2937" />
      <rect x="6" y="14" width="4" height="2" rx="0.5" fill="#1F2937" />
      <rect x="14" y="6" width="4" height="2" rx="0.5" fill="#1F2937" />
      <rect x="14" y="10" width="4" height="2" rx="0.5" fill="#1F2937" />
      <rect x="14" y="14" width="4" height="2" rx="0.5" fill="#1F2937" />
      {/* Status LEDs */}
      <circle cx="8" cy="7" r="0.7" fill="#34D399" />
      <circle cx="8" cy="11" r="0.7" fill="#34D399" />
      <circle cx="8" cy="15" r="0.7" fill="#F59E0B" />
      {/* Handle */}
      <rect x="11" y="17" width="2" height="1" rx="0.5" fill="#9CA3AF" />
    </svg>
  );
}

function UtilityMeterIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Meter body (round) */}
      <circle cx="12" cy="12" r="8" fill="#E5E7EB" stroke="#6B7280" strokeWidth="1" />
      {/* Glass dome */}
      <circle cx="12" cy="11" r="5.5" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="0.5" />
      {/* Spinning disk */}
      <ellipse cx="12" cy="13" rx="4" ry="1" fill="#374151" opacity="0.3" />
      {/* Digital readout */}
      <rect x="8.5" y="8" width="7" height="3" rx="0.5" fill="#1F2937" />
      <text x="12" y="10.5" textAnchor="middle" fill="#34D399" fontSize="2.5" fontFamily="monospace">kWh</text>
      {/* Conduit connections */}
      <rect x="10" y="20" width="1.5" height="2" fill="#6B7280" />
      <rect x="12.5" y="20" width="1.5" height="2" fill="#6B7280" />
    </svg>
  );
}

function MeterRoomIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Building/room outline */}
      <rect x="3" y="5" width="18" height="15" rx="1" fill="#78716C" />
      {/* Roof */}
      <path d="M2 5 L12 1 L22 5" fill="#57534E" stroke="#44403C" strokeWidth="0.5" />
      {/* Door */}
      <rect x="9" y="12" width="6" height="8" rx="0.5" fill="#44403C" />
      <circle cx="13.5" cy="16" r="0.7" fill="#D4D4D8" />
      {/* High voltage sign */}
      <rect x="8" y="6" width="8" height="4" rx="0.5" fill="#FDE047" />
      <path d="M13 6.5 L11 8.5 L13 8.5 L11 10.5" stroke="#DC2626" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Ventilation */}
      <rect x="4" y="7" width="2" height="0.5" fill="#A8A29E" />
      <rect x="4" y="8.5" width="2" height="0.5" fill="#A8A29E" />
      <rect x="4" y="10" width="2" height="0.5" fill="#A8A29E" />
    </svg>
  );
}

function JunctionBoxIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Box */}
      <rect x="5" y="5" width="14" height="14" rx="1.5" fill="#6B7280" stroke="#4B5563" strokeWidth="0.5" />
      {/* Cover plate screws */}
      <circle cx="7" cy="7" r="0.8" fill="#9CA3AF" />
      <circle cx="17" cy="7" r="0.8" fill="#9CA3AF" />
      <circle cx="7" cy="17" r="0.8" fill="#9CA3AF" />
      <circle cx="17" cy="17" r="0.8" fill="#9CA3AF" />
      {/* Conduit knockouts */}
      <circle cx="12" cy="5" r="1.5" fill="#4B5563" />
      <circle cx="12" cy="19" r="1.5" fill="#4B5563" />
      <circle cx="5" cy="12" r="1.5" fill="#4B5563" />
      <circle cx="19" cy="12" r="1.5" fill="#4B5563" />
      {/* Wire connections inside */}
      <line x1="9" y1="10" x2="15" y2="10" stroke="#DC2626" strokeWidth="1" />
      <line x1="9" y1="12" x2="15" y2="12" stroke="#1F2937" strokeWidth="1" />
      <line x1="9" y1="14" x2="15" y2="14" stroke="#34D399" strokeWidth="1" />
    </svg>
  );
}

function BollardIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Bollard post */}
      <rect x="8" y="3" width="8" height="16" rx="4" fill="#F59E0B" />
      {/* Reflective stripe */}
      <rect x="8" y="8" width="8" height="3" rx="0" fill="#FBBF24" />
      <rect x="8.5" y="8.5" width="7" height="2" rx="0" fill="#FDE68A" opacity="0.6" />
      {/* Top cap */}
      <ellipse cx="12" cy="3.5" rx="4" ry="1.5" fill="#D97706" />
      {/* Base plate */}
      <rect x="6" y="19" width="12" height="2" rx="1" fill="#374151" />
      {/* Anchor bolts */}
      <circle cx="8" cy="20" r="0.7" fill="#6B7280" />
      <circle cx="16" cy="20" r="0.7" fill="#6B7280" />
    </svg>
  );
}

const ICON_COMPONENTS: Record<EquipmentType, React.FC<{ size?: number; className?: string }>> = {
  charger_l2: L2ChargerIcon,
  charger_l3: L3SuperchargerIcon,
  transformer: TransformerIcon,
  switchgear: SwitchgearIcon,
  utility_meter: UtilityMeterIcon,
  meter_room: MeterRoomIcon,
  junction_box: JunctionBoxIcon,
  bollard: BollardIcon,
};

export function EquipmentIcon({
  type,
  size = 24,
  className,
}: {
  type: EquipmentType;
  size?: number;
  className?: string;
}) {
  const Component = ICON_COMPONENTS[type];
  return <Component size={size} className={className} />;
}

/**
 * Generates an SVG data URI for use in Mapbox markers (DOM elements).
 * Returns an inline SVG string that can be set as innerHTML.
 */
export function getEquipmentSvgHtml(type: EquipmentType, size = 28): string {
  const svgMap: Record<EquipmentType, string> = {
    charger_l3: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <rect x="7" y="3" width="10" height="16" rx="2" fill="#1E3A5F"/>
      <rect x="9" y="5" width="6" height="5" rx="1" fill="#60A5FA"/>
      <path d="M17 14 C19 14,19 17,17 17" stroke="#F59E0B" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <rect x="16.5" y="16.5" width="3" height="2" rx="0.5" fill="#F59E0B"/>
      <path d="M13 6 L11 9 L13 9 L11 12" stroke="#FDE047" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <rect x="6" y="19" width="12" height="2" rx="1" fill="#0F172A"/>
    </svg>`,
    charger_l2: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="4" width="12" height="14" rx="2" fill="#2563EB"/>
      <rect x="8" y="6" width="8" height="4" rx="1" fill="#93C5FD"/>
      <path d="M12 18 L12 20 C12 21,14 21,14 20 L14 19" stroke="#374151" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="14" cy="19" r="1.5" fill="#374151"/><circle cx="14" cy="19" r="0.5" fill="#93C5FD"/>
      <circle cx="12" cy="12" r="1.5" fill="#34D399"/>
      <rect x="5" y="3" width="14" height="1.5" rx="0.5" fill="#64748B"/>
    </svg>`,
    transformer: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="6" width="16" height="12" rx="1" fill="#6B7280"/>
      <rect x="2" y="8" width="2" height="8" rx="0.5" fill="#9CA3AF"/>
      <rect x="20" y="8" width="2" height="8" rx="0.5" fill="#9CA3AF"/>
      <path d="M13 8 L11 12 L13 12 L11 16" stroke="#FDE047" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="8" cy="5" r="1.5" fill="#DC2626"/><circle cx="16" cy="5" r="1.5" fill="#DC2626"/>
      <rect x="3" y="18" width="18" height="2" rx="0.5" fill="#374151"/>
    </svg>`,
    switchgear: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="18" rx="1" fill="#4B5563"/>
      <line x1="12" y1="4" x2="12" y2="20" stroke="#374151" stroke-width="0.5"/>
      <rect x="6" y="6" width="4" height="2" rx="0.5" fill="#1F2937"/>
      <rect x="6" y="10" width="4" height="2" rx="0.5" fill="#1F2937"/>
      <rect x="6" y="14" width="4" height="2" rx="0.5" fill="#1F2937"/>
      <rect x="14" y="6" width="4" height="2" rx="0.5" fill="#1F2937"/>
      <rect x="14" y="10" width="4" height="2" rx="0.5" fill="#1F2937"/>
      <rect x="14" y="14" width="4" height="2" rx="0.5" fill="#1F2937"/>
      <circle cx="8" cy="7" r="0.7" fill="#34D399"/>
      <circle cx="8" cy="11" r="0.7" fill="#34D399"/>
      <circle cx="8" cy="15" r="0.7" fill="#F59E0B"/>
    </svg>`,
    utility_meter: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" fill="#E5E7EB" stroke="#6B7280" stroke-width="1"/>
      <circle cx="12" cy="11" r="5.5" fill="#DBEAFE" stroke="#93C5FD" stroke-width="0.5"/>
      <rect x="8.5" y="8" width="7" height="3" rx="0.5" fill="#1F2937"/>
      <rect x="10" y="20" width="1.5" height="2" fill="#6B7280"/>
      <rect x="12.5" y="20" width="1.5" height="2" fill="#6B7280"/>
    </svg>`,
    meter_room: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="15" rx="1" fill="#78716C"/>
      <path d="M2 5 L12 1 L22 5" fill="#57534E" stroke="#44403C" stroke-width="0.5"/>
      <rect x="9" y="12" width="6" height="8" rx="0.5" fill="#44403C"/>
      <circle cx="13.5" cy="16" r="0.7" fill="#D4D4D8"/>
      <rect x="8" y="6" width="8" height="4" rx="0.5" fill="#FDE047"/>
      <path d="M13 6.5 L11 8.5 L13 8.5 L11 10.5" stroke="#DC2626" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,
    junction_box: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="5" width="14" height="14" rx="1.5" fill="#6B7280" stroke="#4B5563" stroke-width="0.5"/>
      <circle cx="7" cy="7" r="0.8" fill="#9CA3AF"/><circle cx="17" cy="7" r="0.8" fill="#9CA3AF"/>
      <circle cx="7" cy="17" r="0.8" fill="#9CA3AF"/><circle cx="17" cy="17" r="0.8" fill="#9CA3AF"/>
      <circle cx="12" cy="5" r="1.5" fill="#4B5563"/><circle cx="12" cy="19" r="1.5" fill="#4B5563"/>
      <line x1="9" y1="10" x2="15" y2="10" stroke="#DC2626" stroke-width="1"/>
      <line x1="9" y1="12" x2="15" y2="12" stroke="#1F2937" stroke-width="1"/>
      <line x1="9" y1="14" x2="15" y2="14" stroke="#34D399" stroke-width="1"/>
    </svg>`,
    bollard: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <rect x="8" y="3" width="8" height="16" rx="4" fill="#F59E0B"/>
      <rect x="8" y="8" width="8" height="3" fill="#FBBF24"/>
      <ellipse cx="12" cy="3.5" rx="4" ry="1.5" fill="#D97706"/>
      <rect x="6" y="19" width="12" height="2" rx="1" fill="#374151"/>
      <circle cx="8" cy="20" r="0.7" fill="#6B7280"/><circle cx="16" cy="20" r="0.7" fill="#6B7280"/>
    </svg>`,
  };

  return svgMap[type] ?? '';
}

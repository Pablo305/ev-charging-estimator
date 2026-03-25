'use client';

import { useMemo } from 'react';
import type { PatchBatch, EstimatePatch } from '@/lib/map/types';
import { getImpactSummary } from '@/lib/map/patch-impact';

interface PatchReviewPanelProps {
  batch: PatchBatch | null;
  onAcceptPatch: (patchId: string) => void;
  onRejectPatch: (patchId: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onAcceptSafe?: (ids: string[]) => void;
}

function getTabForField(fieldPath: string): string {
  const prefix = fieldPath.split('.')[0];
  switch (prefix) {
    case 'electrical':
      return 'Electrical';
    case 'charger':
      return 'Charger';
    case 'mapWorkspace':
      return 'Electrical';
    case 'parkingEnvironment':
      return 'Parking';
    case 'site':
      return 'Site';
    case 'project':
      return 'Project';
    case 'customer':
      return 'Customer';
    case 'accessories':
      return 'Accessories';
    case 'makeReady':
    case 'chargerInstall':
    case 'purchasingChargers':
    case 'signageBollards':
      return 'Responsibilities';
    case 'designEngineering':
    case 'permit':
      return 'Permit/Design';
    case 'network':
      return 'Network';
    default:
      return 'Project';
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return `${value}`;
  if (Array.isArray(value)) return `[${value.join(', ')}]`;
  return String(value);
}

function fieldLabel(path: string): string {
  const labels: Record<string, string> = {
    // Map workspace measurements
    'mapWorkspace.conduitDistance_ft': 'Conduit Distance',
    'mapWorkspace.feederDistance_ft': 'Feeder Distance',
    'mapWorkspace.trenchingDistance_ft': 'Trenching Distance',
    'mapWorkspace.boringDistance_ft': 'Boring Distance',
    'mapWorkspace.concreteCuttingDistance_ft': 'Concrete Cutting Distance',
    'mapWorkspace.chargerCountFromMap': 'Charger Count (Map)',
    'mapWorkspace.siteCoordinates': 'Site Coordinates',
    // Electrical
    'electrical.transformerRequired': 'Transformer Required',
    'electrical.switchgearRequired': 'Switchgear Required',
    'electrical.utilityCoordinationRequired': 'Utility Coordination',
    'electrical.meterRoomRequired': 'Meter Room Required',
    'electrical.junctionBoxCount': 'Junction Box Count',
    'electrical.panelUpgradeRequired': 'Panel Upgrade Required',
    'electrical.serviceType': 'Electrical Service Type',
    'electrical.distanceToPanel_ft': 'Distance to Panel',
    'electrical.availableAmps': 'Available Amps',
    'electrical.breakerSpaceAvailable': 'Breaker Space Available',
    // Parking
    'parkingEnvironment.type': 'Parking Type',
    'parkingEnvironment.surfaceType': 'Surface Type',
    'parkingEnvironment.trafficControlRequired': 'Traffic Control',
    'parkingEnvironment.hasPTSlab': 'Post-Tensioned Slab',
    'parkingEnvironment.coringRequired': 'Coring Required',
    'parkingEnvironment.slabScanRequired': 'Slab Scan Required',
    'parkingEnvironment.boringRequired': 'Boring Required',
    'parkingEnvironment.trenchingRequired': 'Trenching Required',
    'parkingEnvironment.fireRatedPenetrations': 'Fire-Rated Penetrations',
    // Charger
    'charger.mountType': 'Mount Type',
    'charger.count': 'Charger Count',
    'charger.chargingLevel': 'Charging Level',
    'charger.brand': 'Charger Brand',
    'charger.model': 'Charger Model',
    'charger.ampsPerCharger': 'Amps Per Charger',
    // Site
    'site.siteType': 'Site Type',
    'site.address': 'Site Address',
    // Responsibilities
    'makeReady.responsibility': 'Make-Ready Responsibility',
    'chargerInstall.responsibility': 'Charger Installation',
    'purchasingChargers.responsibility': 'Charger Purchasing',
    'signageBollards.responsibility': 'Signage & Bollards',
    // Design & Permit
    'designEngineering.responsibility': 'Design Engineering',
    'designEngineering.stampedPlansRequired': 'Stamped Plans Required',
    'permit.responsibility': 'Permit Responsibility',
    // Accessories
    'accessories.bollardQty': 'Bollard Quantity',
    'accessories.signQty': 'Sign Quantity',
    'accessories.wheelStopQty': 'Wheel Stop Quantity',
    // Project
    'project.projectType': 'Project Type',
    'project.isNewConstruction': 'New Construction',
  };
  // Fallback: format the last segment of the path as a human-readable label
  return labels[path] ?? (path.split('.').pop() ?? path)
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

const SOURCE_CONFIG: Record<EstimatePatch['source'], { text: string; color: string; tooltip: string }> = {
  ai_analysis: {
    text: 'AI',
    color: 'bg-purple-100 text-purple-700',
    tooltip: 'Detected by AI from satellite or street view imagery',
  },
  map_measurement: {
    text: 'Map',
    color: 'bg-blue-100 text-blue-700',
    tooltip: 'Measured from drawn lines on the satellite map',
  },
  map_equipment: {
    text: 'Equip',
    color: 'bg-green-100 text-green-700',
    tooltip: 'Equipment placed on the map (chargers, meters, etc.)',
  },
  auto_infer: {
    text: 'Auto',
    color: 'bg-amber-100 text-amber-700',
    tooltip: 'Automatically inferred from other selections (e.g., L3 requires 480V)',
  },
};

function extractConfidence(reason: string): number | null {
  const match = reason.match(/(\d+)%\s*confidence/);
  return match ? parseInt(match[1], 10) : null;
}

function PatchRow({
  patch,
  onAccept,
  onReject,
}: {
  patch: EstimatePatch;
  onAccept: () => void;
  onReject: () => void;
}) {
  const statusColors = {
    pending: 'border-amber-200 bg-amber-50',
    accepted: 'border-green-200 bg-green-50',
    rejected: 'border-red-200 bg-red-50',
  };

  const confidence = extractConfidence(patch.reason);
  const sourceConfig = SOURCE_CONFIG[patch.source];

  return (
    <div className={`rounded-lg border p-3 transition-all duration-200 ${statusColors[patch.status]}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
          {fieldLabel(patch.fieldPath)}
          <span
            className={`cursor-help rounded px-1.5 py-0.5 text-[10px] font-bold ${sourceConfig.color}`}
            title={sourceConfig.tooltip}
          >
            {sourceConfig.text}
          </span>
          {confidence !== null && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              confidence >= 75 ? 'bg-green-100 text-green-700' :
              confidence >= 50 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {confidence}%
            </span>
          )}
        </span>
        {patch.status === 'pending' && (
          <div className="flex gap-1">
            <button
              onClick={onAccept}
              className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-green-700"
            >
              Accept
            </button>
            <button
              onClick={onReject}
              className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-red-600 ring-1 ring-red-200 transition hover:bg-red-50"
            >
              Reject
            </button>
          </div>
        )}
        {patch.status !== 'pending' && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              patch.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {patch.status === 'accepted' ? 'Accepted' : 'Rejected'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-400">{formatValue(patch.previousValue)}</span>
        <span className="text-gray-300">→</span>
        <span className="font-mono font-semibold text-gray-900">
          {formatValue(patch.proposedValue)}
          {typeof patch.proposedValue === 'number' && patch.fieldPath.includes('Distance') ? ' ft' : ''}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] text-gray-500">{patch.reason}</span>
        <a
          href={`/estimate?tab=${encodeURIComponent(getTabForField(patch.fieldPath))}&field=${encodeURIComponent(patch.fieldPath)}`}
          className="ml-2 flex-shrink-0 text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          View in form &rarr;
        </a>
      </div>
      {/* Cost impact summary */}
      {(() => {
        const impact = getImpactSummary(patch.fieldPath, patch.proposedValue);
        return impact ? (
          <div className="mt-1.5 rounded bg-gray-50 px-2 py-1 text-[10px] text-gray-600">
            <span className="font-medium text-gray-500">Impact:</span> {impact}
          </div>
        ) : null;
      })()}
      {/* Auto-accepted badge */}
      {patch.autoAccepted && patch.status === 'accepted' && (
        <div className="mt-1">
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
            Auto-applied (field was empty)
          </span>
        </div>
      )}
    </div>
  );
}

export function PatchReviewPanel({
  batch,
  onAcceptPatch,
  onRejectPatch,
  onAcceptAll,
  onRejectAll,
  onAcceptSafe,
}: PatchReviewPanelProps) {
  const pending = useMemo(() => batch?.patches.filter((p) => p.status === 'pending') ?? [], [batch]);
  const resolved = useMemo(() => batch?.patches.filter((p) => p.status !== 'pending') ?? [], [batch]);

  // High-confidence patches that can be auto-accepted
  const highConfidencePending = useMemo(() =>
    pending.filter((p) => {
      const conf = extractConfidence(p.reason);
      return conf !== null && conf >= 80;
    }),
    [pending],
  );

  // Group pending patches by form tab category
  const pendingByCategory = useMemo(() => {
    const groups: Record<string, EstimatePatch[]> = {};
    for (const p of pending) {
      const tab = getTabForField(p.fieldPath);
      if (!groups[tab]) groups[tab] = [];
      groups[tab].push(p);
    }
    return groups;
  }, [pending]);

  const accepted = useMemo(() => batch?.patches.filter((p) => p.status === 'accepted') ?? [], [batch]);
  const rejected = useMemo(() => batch?.patches.filter((p) => p.status === 'rejected') ?? [], [batch]);

  if (!batch || batch.patches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-5 text-center">
        <div className="mb-2 text-2xl">&#128506;&#65039;</div>
        <div className="text-sm font-medium text-gray-600">No changes yet</div>
        <div className="mt-1 text-xs text-gray-400">
          Enter an address for AI analysis, or draw runs on the map
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Explanatory header */}
      <div className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-800">
        These suggestions sync your map drawings with the estimate form.
        <strong> Accept</strong> applies the value. <strong>Reject</strong> keeps your current entry.
      </div>

      {/* Status count badges */}
      <div className="flex gap-2 text-[10px] font-medium">
        {pending.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
            {pending.length} pending
          </span>
        )}
        {accepted.length > 0 && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
            {accepted.length} accepted
          </span>
        )}
        {rejected.length > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
            {rejected.length} rejected
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Pending ({pending.length})
        </div>
        {pending.length > 1 && (
          <div className="flex gap-1">
            {highConfidencePending.length > 0 && onAcceptSafe && (
              <button
                onClick={() => onAcceptSafe(highConfidencePending.map((p) => p.id))}
                className="rounded-md bg-purple-600 px-2 py-1 text-[10px] font-medium text-white shadow-sm transition hover:bg-purple-700"
                title="Accept all patches with 80%+ AI confidence"
              >
                Accept Safe ({highConfidencePending.length})
              </button>
            )}
            <button
              onClick={onAcceptAll}
              className="rounded-md bg-green-600 px-2 py-1 text-[10px] font-medium text-white shadow-sm transition hover:bg-green-700"
            >
              Accept All
            </button>
            <button
              onClick={onRejectAll}
              className="rounded-md bg-white px-2 py-1 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-50"
            >
              Reject All
            </button>
          </div>
        )}
      </div>

      {Object.entries(pendingByCategory).map(([category, patches]) => (
        <div key={category}>
          <div className="mb-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {category} ({patches.length})
          </div>
          {patches.map((patch) => (
            <PatchRow
              key={patch.id}
              patch={patch}
              onAccept={() => onAcceptPatch(patch.id)}
              onReject={() => onRejectPatch(patch.id)}
            />
          ))}
        </div>
      ))}

      {resolved.length > 0 && (
        <>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Resolved ({resolved.length})
          </div>
          {resolved.map((patch) => (
            <PatchRow
              key={patch.id}
              patch={patch}
              onAccept={() => {}}
              onReject={() => {}}
            />
          ))}
        </>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { SiteIntelligence } from '@/lib/ai/site-assessment-types';

interface SiteIntelligenceCardProps {
  intelligence: SiteIntelligence;
  onSuggestPowerSource?: () => void;
  onSuggestChargerZones?: () => void;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 75 ? 'bg-green-100 text-green-800 ring-green-200'
    : pct >= 50 ? 'bg-amber-100 text-amber-800 ring-amber-200'
    : 'bg-red-100 text-red-800 ring-red-200';

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${color}`}>
      {pct}%
    </span>
  );
}

const SOURCE_TOOLTIPS = {
  satellite: 'Detected from satellite/aerial imagery',
  streetview: 'Detected from Google Street View imagery',
  both: 'Confirmed by both satellite and street view',
};

function SourceIcon({ source }: { source: 'satellite' | 'streetview' | 'both' }) {
  const icons = { satellite: '🛰️', streetview: '👁️', both: '✓' };
  const colors = {
    satellite: 'bg-blue-100 text-blue-700',
    streetview: 'bg-purple-100 text-purple-700',
    both: 'bg-green-100 text-green-700',
  };

  return (
    <span
      className={`cursor-help rounded px-1.5 py-0.5 text-[10px] font-bold ${colors[source]}`}
      title={SOURCE_TOOLTIPS[source]}
    >
      {icons[source]}
    </span>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <div className="flex items-start gap-1.5">
      {icon && <span className="mt-0.5 text-xs">{icon}</span>}
      <div>
        <span className="text-gray-500">{label}: </span>
        <span className="font-medium text-gray-800">{value}</span>
      </div>
    </div>
  );
}

export function SiteIntelligenceCard({ intelligence, onSuggestPowerSource, onSuggestChargerZones }: SiteIntelligenceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { satelliteAnalysis, streetViewAnalysis, mergedInferences } = intelligence;

  // Extract key findings from merged inferences
  const siteType = mergedInferences.find((m) => m.fieldPath === 'site.siteType');
  const parkingType = mergedInferences.find((m) => m.fieldPath === 'parkingEnvironment.type');
  const surfaceType = mergedInferences.find((m) => m.fieldPath === 'parkingEnvironment.surfaceType');
  const mountType = mergedInferences.find((m) => m.fieldPath === 'charger.mountType');
  const chargerCount = mergedInferences.find((m) => m.fieldPath === 'charger.count');

  // Safely extract nested objects with runtime checks
  const satElecRaw = satelliteAnalysis?.electricalInfrastructure;
  const satElectrical = typeof satElecRaw === 'object' && satElecRaw !== null
    ? satElecRaw as unknown as Record<string, unknown>
    : null;

  const svElecRaw = streetViewAnalysis?.electricalObservation;
  const svElectrical = typeof svElecRaw === 'object' && svElecRaw !== null
    ? svElecRaw as unknown as Record<string, unknown>
    : null;

  // Conduit routing from street view
  const crRaw = streetViewAnalysis?.conduitRouting;
  const conduitRouting = typeof crRaw === 'object' && crRaw !== null
    ? crRaw as unknown as Record<string, unknown>
    : null;

  // ADA compliance from street view
  const adaRaw = streetViewAnalysis?.adaCompliance;
  const adaCompliance = typeof adaRaw === 'object' && adaRaw !== null
    ? adaRaw as unknown as Record<string, unknown>
    : null;

  // Mount recommendation
  const mrRaw = streetViewAnalysis?.mountRecommendation;
  const mountRec = typeof mrRaw === 'object' && mrRaw !== null
    ? mrRaw as unknown as Record<string, unknown>
    : null;

  // Collect all concerns with runtime array check
  const satConcerns = Array.isArray(satelliteAnalysis?.concerns) ? satelliteAnalysis.concerns : [];
  const svConcerns = Array.isArray(streetViewAnalysis?.concerns) ? streetViewAnalysis.concerns : [];
  const allConcerns = [...satConcerns, ...svConcerns].filter(
    (c): c is string => typeof c === 'string',
  );
  const uniqueConcerns = [...new Set(allConcerns)];

  // Parking layout from satellite with runtime check
  const plgRaw = satelliteAnalysis?.parkingLayoutGeometry;
  const parkingLayout = typeof plgRaw === 'object' && plgRaw !== null
    ? plgRaw as Record<string, unknown>
    : null;

  const estimatedSpaces = satelliteAnalysis?.estimatedParkingSpaces as number | null;

  // Panel location hint for suggested placement
  const panelLocation = (typeof svElectrical?.estimatedPanelLocation === 'string' && svElectrical.estimatedPanelLocation)
    ? svElectrical.estimatedPanelLocation as string
    : (typeof satElectrical?.estimatedPanelSide === 'string' && satElectrical.estimatedPanelSide)
    ? `${satElectrical.estimatedPanelSide as string} side of building`
    : null;

  // Suggested charger locations
  const suggestedLocations = typeof mountRec?.suggestedLocations === 'string' && mountRec.suggestedLocations
    ? mountRec.suggestedLocations as string
    : null;

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50 to-white p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <h3 className="text-sm font-bold text-gray-900">AI Site Assessment</h3>
        </div>
        <ConfidenceBadge confidence={intelligence.overallConfidence} />
      </div>

      {/* Site overview grid */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {siteType && (
          <div className="rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-gray-100">
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Site Type</div>
            <div className="flex items-center gap-1 text-sm font-medium text-gray-800">
              {String(siteType.value).replace(/_/g, ' ')}
              <SourceIcon source={siteType.source} />
            </div>
          </div>
        )}
        {parkingType && (
          <div className="rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-gray-100">
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Parking</div>
            <div className="flex items-center gap-1 text-sm font-medium text-gray-800">
              {String(parkingType.value).replace(/_/g, ' ')}
              <SourceIcon source={parkingType.source} />
            </div>
          </div>
        )}
        {surfaceType && (
          <div className="rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-gray-100">
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Surface</div>
            <div className="flex items-center gap-1 text-sm font-medium text-gray-800">
              {String(surfaceType.value)}
              <SourceIcon source={surfaceType.source} />
            </div>
          </div>
        )}
        {mountType && (
          <div className="rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-gray-100">
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Mount Type</div>
            <div className="flex items-center gap-1 text-sm font-medium text-gray-800">
              {String(mountType.value)}
              <SourceIcon source={mountType.source} />
            </div>
          </div>
        )}
      </div>

      {/* Parking layout summary */}
      {(estimatedSpaces !== null || parkingLayout) && (
        <div className="mb-3 rounded-lg border border-gray-100 bg-white p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <span>🅿️</span> Parking Layout
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            {estimatedSpaces !== null && (
              <InfoRow label="Est. spaces" value={String(estimatedSpaces)} />
            )}
            {chargerCount && (
              <InfoRow label="Suggested chargers" value={String(chargerCount.value)} />
            )}
            {typeof parkingLayout?.stallOrientation === 'string' && parkingLayout.stallOrientation && (
              <InfoRow label="Stall orientation" value={parkingLayout.stallOrientation as string} />
            )}
            {typeof parkingLayout?.driveAisleWidthEstimate === 'string' && parkingLayout.driveAisleWidthEstimate && (
              <InfoRow label="Drive aisle" value={parkingLayout.driveAisleWidthEstimate as string} />
            )}
            {parkingLayout?.adaZonesVisible === true && (
              <div className="flex items-center gap-1 text-blue-600">
                <span>♿</span> ADA zones detected
              </div>
            )}
          </div>
        </div>
      )}

      {/* Electrical infrastructure */}
      {(satElectrical || svElectrical) && (
        <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <span>⚡</span> Electrical Infrastructure
          </div>
          <div className="space-y-1 text-xs text-gray-700">
            {svElectrical?.panelVisible === true && <InfoRow icon="📋" label="Panel" value="Visible" />}
            {(svElectrical?.transformerVisible === true || satElectrical?.transformerPadVisible === true) && (
              <InfoRow icon="🔌" label="Transformer" value="Detected" />
            )}
            {(svElectrical?.meterClusterVisible === true || satElectrical?.meterClusterVisible === true) && (
              <InfoRow icon="📊" label="Meter cluster" value="Visible" />
            )}
            {svElectrical?.existingConduitVisible === true && (
              <InfoRow icon="🔧" label="Existing conduit" value="Visible" />
            )}
            {panelLocation && (
              <InfoRow icon="📍" label="Panel location" value={panelLocation} />
            )}
            {typeof svElectrical?.description === 'string' && svElectrical.description && (
              <div className="mt-1.5 rounded bg-amber-100/50 p-1.5 text-[11px] italic text-gray-600">
                {svElectrical.description as string}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mount recommendation */}
      {mountRec && typeof mountRec.type === 'string' && mountRec.type && (
        <div className="mb-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-indigo-800">
            <span>🔩</span> Mount Recommendation
          </div>
          <div className="text-xs text-gray-700">
            <span className="font-semibold capitalize">{mountRec.type as string}</span>
            {typeof mountRec.reason === 'string' && mountRec.reason && (
              <span> — {mountRec.reason as string}</span>
            )}
          </div>
          {suggestedLocations && (
            <div className="mt-1 text-[11px] text-indigo-600">
              Suggested: {suggestedLocations}
            </div>
          )}
        </div>
      )}

      {/* Conduit routing */}
      {conduitRouting && (
        <div className="mb-3 rounded-lg border border-teal-100 bg-teal-50 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-teal-800">
            <span>🔧</span> Conduit Routing
          </div>
          <div className="space-y-1 text-xs text-gray-700">
            {typeof conduitRouting.wallMountFeasibility === 'string' && (
              <InfoRow label="Wall mount" value={conduitRouting.wallMountFeasibility as string} />
            )}
            {typeof conduitRouting.wallMaterial === 'string' && (
              <InfoRow label="Wall material" value={conduitRouting.wallMaterial as string} />
            )}
            {Array.isArray(conduitRouting.routingOpportunities) && conduitRouting.routingOpportunities.length > 0 && (
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-teal-700">
                {conduitRouting.routingOpportunities.filter((s): s is string => typeof s === 'string').map((opp, i) => (
                  <li key={i}>{opp}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* AI suggested placement hints */}
      {(panelLocation || suggestedLocations) && (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-green-800">
            <span>💡</span> AI Placement Suggestions
          </div>
          <div className="space-y-2">
            {panelLocation && (
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-700">
                  Power source: <span className="font-medium">{panelLocation}</span>
                </div>
                {onSuggestPowerSource && (
                  <button
                    onClick={onSuggestPowerSource}
                    className="rounded-md bg-red-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm transition hover:bg-red-700"
                  >
                    Mark Power Source
                  </button>
                )}
              </div>
            )}
            {suggestedLocations && (
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-700">
                  Chargers: <span className="font-medium">{suggestedLocations}</span>
                </div>
                {onSuggestChargerZones && (
                  <button
                    onClick={onSuggestChargerZones}
                    className="rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    Mark Chargers
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Concerns */}
      {uniqueConcerns.length > 0 && (
        <div className="mb-3 rounded-lg border border-red-100 bg-red-50 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-700">
            <span>⚠️</span> Concerns ({uniqueConcerns.length})
          </div>
          <ul className="list-inside list-disc space-y-0.5">
            {uniqueConcerns.map((concern, i) => (
              <li key={i} className="text-xs text-gray-600">{concern}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Surface transitions */}
      {Array.isArray(parkingLayout?.surfaceTransitions) && parkingLayout.surfaceTransitions.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-purple-700">
            <span>🔀</span> Surface Transitions
          </div>
          <ul className="list-inside list-disc space-y-0.5">
            {parkingLayout.surfaceTransitions.map((t, i) => (
              <li key={i} className="text-xs text-gray-600">{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ADA compliance */}
      {adaCompliance && (
        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-blue-800">
            <span>♿</span> ADA Compliance
          </div>
          <div className="space-y-1 text-xs text-gray-700">
            {adaCompliance.adaParkingVisible === true && (
              <InfoRow label="ADA parking" value="Visible" />
            )}
            <InfoRow
              label="Path of travel"
              value={adaCompliance.pathOfTravelClear === true ? 'Clear' : 'Concerns noted'}
            />
            {Array.isArray(adaCompliance.concerns) && adaCompliance.concerns.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-[11px] text-amber-700">
                {adaCompliance.concerns.filter((s): s is string => typeof s === 'string').map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Expandable raw observations */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-blue-600 transition hover:text-blue-800"
      >
        <span className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        {expanded ? 'Hide raw observations' : 'Show raw observations'}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {satelliteAnalysis?.siteDescription && (
            <div className="rounded-lg bg-gray-50 p-2.5">
              <div className="mb-1 text-[10px] font-bold uppercase text-gray-400">🛰️ Satellite</div>
              <p className="text-xs text-gray-600">{satelliteAnalysis.siteDescription as string}</p>
            </div>
          )}
          {streetViewAnalysis?.siteDescription && (
            <div className="rounded-lg bg-gray-50 p-2.5">
              <div className="mb-1 text-[10px] font-bold uppercase text-gray-400">👁️ Street View</div>
              <p className="text-xs text-gray-600">{streetViewAnalysis.siteDescription as string}</p>
            </div>
          )}
          {streetViewAnalysis?.observations && (
            <div className="rounded-lg bg-gray-50 p-2.5">
              <div className="mb-1 text-[10px] font-bold uppercase text-gray-400">📝 Observations</div>
              {Object.entries(streetViewAnalysis.observations as Record<string, string>).map(([key, val]) => (
                <div key={key} className="text-xs text-gray-600">
                  <span className="font-medium capitalize text-gray-700">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>{' '}
                  {val}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

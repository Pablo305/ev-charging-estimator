'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { InputField, SelectField, BoolField, FormGrid } from '../FormField';
import { NudgeBanner } from '../NudgeBanner';
import { MapBadge } from '../MapBadge';

const SERVICE_TYPES = [
  { value: '120v', label: '120V' },
  { value: '208v', label: '208V' },
  { value: '240v', label: '240V' },
  { value: '480v_3phase', label: '480V 3-Phase' },
  { value: 'unknown', label: 'Unknown' },
];

export function ElectricalSection() {
  const { input, updateField } = useEstimate();
  const e = input.electrical;
  const mw = input.mapWorkspace;

  return (
    <>
      {/* Nudges handle capacity warnings via nudge engine — no duplicate inline banners */}
      <NudgeBanner tab="Electrical" />

      {!e.availableCapacityKnown && input.charger.count > 0 && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-[0.75rem] text-blue-700">
          Electrical capacity unknown. A site survey is recommended before finalizing the estimate.
        </div>
      )}

      <div className="mb-5">
        <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.04em]" style={{ color: 'var(--system-blue)' }}>Service & Capacity</p>
        <FormGrid>
          <SelectField label="Service Type" value={e.serviceType} onChange={(v) => updateField('electrical.serviceType', v)} options={SERVICE_TYPES} placeholder="-- Unknown --" />
          <InputField label="Distance to Panel (ft)" value={e.distanceToPanel_ft} onChange={(v) => updateField('electrical.distanceToPanel_ft', v ? parseInt(v) : null)} type="number" placeholder="Estimated feet" hint="Drives conduit and wire run costs" />
          <InputField label="Available Amps" value={e.availableAmps} onChange={(v) => updateField('electrical.availableAmps', v ? parseInt(v) : null)} type="number" />
          <SelectField label="Capacity Known?" value={String(e.availableCapacityKnown)} onChange={(v) => updateField('electrical.availableCapacityKnown', v === 'true')} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} placeholder="" />
          <BoolField label="Breaker Space Available?" value={e.breakerSpaceAvailable} onChange={(v) => updateField('electrical.breakerSpaceAvailable', v)} />
        </FormGrid>
      </div>

      <div className="mb-5">
        <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.04em]" style={{ color: 'var(--system-orange)' }}>Upgrades & Major Equipment</p>
        <FormGrid>
          <div className="flex items-center gap-1">
            <BoolField label="Panel Upgrade Required?" value={e.panelUpgradeRequired} onChange={(v) => updateField('electrical.panelUpgradeRequired', v)} />
            {mw?.hasPanelPlaced && <MapBadge label="Panel on map" />}
          </div>
          <div className="flex items-center gap-1">
            <BoolField label="Transformer Required?" value={e.transformerRequired} onChange={(v) => updateField('electrical.transformerRequired', v)} />
            {mw?.drawings?.equipment?.some(eq => eq.equipmentType === 'transformer') && <MapBadge />}
          </div>
          <div className="flex items-center gap-1">
            <BoolField label="Switchgear Required?" value={e.switchgearRequired} onChange={(v) => updateField('electrical.switchgearRequired', v)} />
            {mw?.drawings?.equipment?.some(eq => eq.equipmentType === 'switchgear') && <MapBadge />}
          </div>
          <div className="flex items-center gap-1">
            <BoolField label="Utility Coordination?" value={e.utilityCoordinationRequired} onChange={(v) => updateField('electrical.utilityCoordinationRequired', v)} />
            {mw?.drawings?.equipment?.some(eq => eq.equipmentType === 'utility_meter') && <MapBadge />}
          </div>
        </FormGrid>
      </div>

      <div>
        <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.04em]" style={{ color: '#636366' }}>Additional Details</p>
        <InputField label="Electrical Room Description" value={e.electricalRoomDescription} onChange={(v) => updateField('electrical.electricalRoomDescription', v)} colSpan={3} />
      </div>

      {/* Comprehensive Map-Derived Values */}
      {mw && (
        <div className="mt-4 rounded-[var(--radius-sm)] border-0 bg-[rgba(0,122,255,0.04)] px-4 py-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.04em]" style={{ color: 'var(--system-blue)' }}>Map-Derived Values</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {mw.conduitDistance_ft != null && mw.conduitDistance_ft > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(0,122,255,0.08)', color: 'var(--system-blue)' }}>
                Conduit: {mw.conduitDistance_ft} ft
              </span>
            )}
            {mw.feederDistance_ft != null && mw.feederDistance_ft > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(5,150,105,0.08)', color: '#059669' }}>
                Feeder: {mw.feederDistance_ft} ft
              </span>
            )}
            {mw.trenchingDistance_ft != null && mw.trenchingDistance_ft > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(217,119,6,0.08)', color: '#D97706' }}>
                Trench: {mw.trenchingDistance_ft} ft
              </span>
            )}
            {mw.boringDistance_ft != null && mw.boringDistance_ft > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}>
                Bore: {mw.boringDistance_ft} ft
              </span>
            )}
            {mw.concreteCuttingDistance_ft != null && mw.concreteCuttingDistance_ft > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
                Concrete Cut: {mw.concreteCuttingDistance_ft} ft
              </span>
            )}
            {mw.chargerCountFromMap != null && mw.chargerCountFromMap > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(0,0,0,0.04)', color: '#374151' }}>
                Map Chargers: {mw.chargerCountFromMap}
              </span>
            )}
            {/* Equipment flags from map drawings */}
            {mw.drawings?.equipment?.some((eq) => eq.equipmentType === 'transformer') && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(255,149,0,0.08)', color: 'var(--system-orange)' }}>
                Transformer (on map)
              </span>
            )}
            {mw.drawings?.equipment?.some((eq) => eq.equipmentType === 'switchgear') && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(255,149,0,0.08)', color: 'var(--system-orange)' }}>
                Switchgear (on map)
              </span>
            )}
            {mw.drawings?.equipment?.some((eq) => eq.equipmentType === 'meter_room') && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(255,149,0,0.08)', color: 'var(--system-orange)' }}>
                Meter Room (on map)
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[0.6875rem] text-gray-400">These values from the Map Workspace are used when generating the estimate.</p>
        </div>
      )}
    </>
  );
}

export const ELECTRICAL_REQUIRED_FIELDS: string[] = [];

'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { InputField, SelectField, BoolField, FormGrid } from '../FormField';

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

  return (
    <>
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
          <BoolField label="Panel Upgrade Required?" value={e.panelUpgradeRequired} onChange={(v) => updateField('electrical.panelUpgradeRequired', v)} />
          <BoolField label="Transformer Required?" value={e.transformerRequired} onChange={(v) => updateField('electrical.transformerRequired', v)} />
          <BoolField label="Switchgear Required?" value={e.switchgearRequired} onChange={(v) => updateField('electrical.switchgearRequired', v)} />
          <BoolField label="Utility Coordination?" value={e.utilityCoordinationRequired} onChange={(v) => updateField('electrical.utilityCoordinationRequired', v)} />
        </FormGrid>
      </div>

      <div>
        <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.04em]" style={{ color: '#636366' }}>Additional Details</p>
        <InputField label="Electrical Room Description" value={e.electricalRoomDescription} onChange={(v) => updateField('electrical.electricalRoomDescription', v)} colSpan={3} />
      </div>
      {input.mapWorkspace && (input.mapWorkspace.conduitDistance_ft || input.mapWorkspace.feederDistance_ft) && (
        <div className="mt-4 rounded-[var(--radius-sm)] border-0 bg-[rgba(0,122,255,0.04)] px-4 py-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.04em]" style={{ color: 'var(--system-blue)' }}>Map-Derived Values</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {input.mapWorkspace.conduitDistance_ft != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(0,122,255,0.08)', color: 'var(--system-blue)' }}>
                Conduit: {input.mapWorkspace.conduitDistance_ft} ft (from map)
              </span>
            )}
            {input.mapWorkspace.feederDistance_ft != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(5,150,105,0.08)', color: '#059669' }}>
                Feeder: {input.mapWorkspace.feederDistance_ft} ft (from map)
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[0.6875rem] text-gray-400">These values override the Distance to Panel field above when generating the estimate.</p>
        </div>
      )}
    </>
  );
}

export const ELECTRICAL_REQUIRED_FIELDS: string[] = [];

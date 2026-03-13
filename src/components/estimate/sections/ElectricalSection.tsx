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
    <FormGrid>
      <SelectField label="Service Type" value={e.serviceType} onChange={(v) => updateField('electrical.serviceType', v)} options={SERVICE_TYPES} placeholder="-- Unknown --" />
      <InputField label="Distance to Panel (ft)" value={e.distanceToPanel_ft} onChange={(v) => updateField('electrical.distanceToPanel_ft', v ? parseInt(v) : null)} type="number" placeholder="Estimated feet" hint="Drives conduit and wire run costs" />
      <InputField label="Available Amps" value={e.availableAmps} onChange={(v) => updateField('electrical.availableAmps', v ? parseInt(v) : null)} type="number" />
      <SelectField
        label="Capacity Known?"
        value={String(e.availableCapacityKnown)}
        onChange={(v) => updateField('electrical.availableCapacityKnown', v === 'true')}
        options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]}
        placeholder=""
      />
      <BoolField label="Breaker Space Available?" value={e.breakerSpaceAvailable} onChange={(v) => updateField('electrical.breakerSpaceAvailable', v)} />
      <BoolField label="Panel Upgrade Required?" value={e.panelUpgradeRequired} onChange={(v) => updateField('electrical.panelUpgradeRequired', v)} />
      <BoolField label="Transformer Required?" value={e.transformerRequired} onChange={(v) => updateField('electrical.transformerRequired', v)} />
      <BoolField label="Switchgear Required?" value={e.switchgearRequired} onChange={(v) => updateField('electrical.switchgearRequired', v)} />
      <BoolField label="Utility Coordination?" value={e.utilityCoordinationRequired} onChange={(v) => updateField('electrical.utilityCoordinationRequired', v)} />
      <InputField label="Electrical Room Description" value={e.electricalRoomDescription} onChange={(v) => updateField('electrical.electricalRoomDescription', v)} colSpan={3} />
    </FormGrid>
  );
}

export const ELECTRICAL_REQUIRED_FIELDS: string[] = [];

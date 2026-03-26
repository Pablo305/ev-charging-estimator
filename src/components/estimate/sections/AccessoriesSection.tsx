'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { InputField, CheckboxField, FormGrid } from '../FormField';
import { NudgeBanner } from '../NudgeBanner';
import { MapBadge } from '../MapBadge';

export function AccessoriesSection() {
  const { input, updateField } = useEstimate();
  const a = input.accessories;

  return (
    <>
    <NudgeBanner tab="Accessories" />
    <FormGrid>
      <div>
        <InputField label="Bollard Qty" value={a.bollardQty} onChange={(v) => updateField('accessories.bollardQty', parseInt(v) || 0)} type="number" min={0} />
        {input.mapWorkspace?.drawings?.equipment?.some(eq => eq.equipmentType === 'bollard') && <MapBadge />}
      </div>
      <div>
        <InputField label="Sign Qty" value={a.signQty} onChange={(v) => updateField('accessories.signQty', parseInt(v) || 0)} type="number" min={0} />
        {input.mapWorkspace?.drawings?.equipment?.some(eq => eq.equipmentType === 'ev_sign') && <MapBadge />}
      </div>
      <div>
        <InputField label="Wheel Stop Qty" value={a.wheelStopQty} onChange={(v) => updateField('accessories.wheelStopQty', parseInt(v) || 0)} type="number" min={0} />
        {input.mapWorkspace?.drawings?.equipment?.some(eq => eq.equipmentType === 'wheel_stop') && <MapBadge />}
      </div>
      <CheckboxField label="Striping Required" checked={a.stripingRequired} onChange={(v) => updateField('accessories.stripingRequired', v)} />
      <CheckboxField label="Concrete Pad Required" checked={a.padRequired} onChange={(v) => updateField('accessories.padRequired', v)} />
      <CheckboxField label="Debris Removal" checked={a.debrisRemoval} onChange={(v) => updateField('accessories.debrisRemoval', v)} />
    </FormGrid>
    </>
  );
}

export const ACCESSORIES_REQUIRED_FIELDS: string[] = [];

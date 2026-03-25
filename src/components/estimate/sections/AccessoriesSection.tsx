'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { InputField, CheckboxField, FormGrid } from '../FormField';
import { NudgeBanner } from '../NudgeBanner';

export function AccessoriesSection() {
  const { input, updateField } = useEstimate();
  const a = input.accessories;

  return (
    <>
    <NudgeBanner tab="Accessories" />
    <FormGrid>
      <InputField label="Bollard Qty" value={a.bollardQty} onChange={(v) => updateField('accessories.bollardQty', parseInt(v) || 0)} type="number" min={0} />
      <InputField label="Sign Qty" value={a.signQty} onChange={(v) => updateField('accessories.signQty', parseInt(v) || 0)} type="number" min={0} />
      <InputField label="Wheel Stop Qty" value={a.wheelStopQty} onChange={(v) => updateField('accessories.wheelStopQty', parseInt(v) || 0)} type="number" min={0} />
      <CheckboxField label="Striping Required" checked={a.stripingRequired} onChange={(v) => updateField('accessories.stripingRequired', v)} />
      <CheckboxField label="Concrete Pad Required" checked={a.padRequired} onChange={(v) => updateField('accessories.padRequired', v)} />
      <CheckboxField label="Debris Removal" checked={a.debrisRemoval} onChange={(v) => updateField('accessories.debrisRemoval', v)} />
    </FormGrid>
    </>
  );
}

export const ACCESSORIES_REQUIRED_FIELDS: string[] = [];

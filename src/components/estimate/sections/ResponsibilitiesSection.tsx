'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { SelectField, FormGrid } from '../FormField';

const RESPONSIBILITY_OPTIONS = [
  { value: 'bullet', label: 'Bullet' },
  { value: 'client', label: 'Client' },
  { value: 'tbd', label: 'TBD' },
];

const SIGNAGE_OPTIONS = [
  { value: 'signage', label: 'Signage Only' },
  { value: 'bollards', label: 'Bollards Only' },
  { value: 'signage_bollards', label: 'Signage + Bollards' },
  { value: 'none', label: 'None' },
  { value: 'tbd', label: 'TBD' },
];

export function ResponsibilitiesSection() {
  const { input, updateField } = useEstimate();

  return (
    <FormGrid>
      <SelectField label="Make Ready" value={input.makeReady.responsibility} onChange={(v) => updateField('makeReady.responsibility', v)} options={RESPONSIBILITY_OPTIONS} placeholder="-- TBD --" />
      <SelectField label="Charger Install" value={input.chargerInstall.responsibility} onChange={(v) => updateField('chargerInstall.responsibility', v)} options={RESPONSIBILITY_OPTIONS} placeholder="-- TBD --" />
      <SelectField label="Purchasing Chargers" value={input.purchasingChargers.responsibility} onChange={(v) => updateField('purchasingChargers.responsibility', v)} options={RESPONSIBILITY_OPTIONS} placeholder="-- TBD --" />
      <SelectField label="Signage/Bollards" value={input.signageBollards.responsibility} onChange={(v) => updateField('signageBollards.responsibility', v)} options={SIGNAGE_OPTIONS} placeholder="-- TBD --" />
    </FormGrid>
  );
}

export const RESPONSIBILITIES_REQUIRED_FIELDS: string[] = [];

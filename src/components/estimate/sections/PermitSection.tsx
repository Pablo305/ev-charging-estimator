'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { SelectField, InputField, BoolField, FormGrid } from '../FormField';

const RESPONSIBILITY_OPTIONS = [
  { value: 'bullet', label: 'Bullet' },
  { value: 'client', label: 'Client' },
  { value: 'tbd', label: 'TBD' },
];

export function PermitSection() {
  const { input, updateField } = useEstimate();

  return (
    <FormGrid>
      <SelectField label="Permit Responsibility" value={input.permit.responsibility} onChange={(v) => updateField('permit.responsibility', v)} options={RESPONSIBILITY_OPTIONS} placeholder="-- TBD --" />
      <InputField label="Permit Fee Allowance ($)" value={input.permit.feeAllowance} onChange={(v) => updateField('permit.feeAllowance', v ? parseFloat(v) : null)} type="number" />
      <SelectField label="Design/Eng Responsibility" value={input.designEngineering.responsibility} onChange={(v) => updateField('designEngineering.responsibility', v)} options={RESPONSIBILITY_OPTIONS} placeholder="-- TBD --" />
      <BoolField label="Stamped Plans Required?" value={input.designEngineering.stampedPlansRequired} onChange={(v) => updateField('designEngineering.stampedPlansRequired', v)} />
    </FormGrid>
  );
}

export const PERMIT_REQUIRED_FIELDS: string[] = [];

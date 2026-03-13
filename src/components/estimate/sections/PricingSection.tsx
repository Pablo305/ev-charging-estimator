'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { InputField, SelectField, TextareaField, FormGrid } from '../FormField';

const PRICING_TIERS = [
  { value: 'bulk_discount', label: 'Bulk Discount' },
  { value: 'msrp', label: 'MSRP' },
];

export function PricingSection() {
  const { input, updateField } = useEstimate();
  const ec = input.estimateControls;

  return (
    <FormGrid>
      <SelectField
        label="Pricing Tier"
        value={ec.pricingTier}
        onChange={(v) => updateField('estimateControls.pricingTier', v ?? 'msrp')}
        options={PRICING_TIERS}
        placeholder=""
      />
      <InputField label="Tax Rate (%)" value={ec.taxRate} onChange={(v) => updateField('estimateControls.taxRate', parseFloat(v) || 0)} type="number" step={0.1} />
      <InputField label="Contingency (%)" value={ec.contingencyPercent} onChange={(v) => updateField('estimateControls.contingencyPercent', parseFloat(v) || 0)} type="number" step={1} />
      <InputField label="Markup (%)" value={ec.markupPercent} onChange={(v) => updateField('estimateControls.markupPercent', parseFloat(v) || 0)} type="number" step={1} />
      <TextareaField
        label="Notes"
        value={input.notes}
        onChange={(v) => updateField('notes', v)}
        rows={3}
        colSpan={3}
      />
    </FormGrid>
  );
}

export const PRICING_REQUIRED_FIELDS: string[] = [];

'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { InputField, FormGrid } from '../FormField';

export function CustomerSection() {
  const { input, updateField } = useEstimate();

  return (
    <FormGrid>
      <InputField
        label="Company Name"
        value={input.customer.companyName}
        onChange={(v) => updateField('customer.companyName', v)}
        required
        placeholder="e.g. 396 Property Management LLC"
      />
      <InputField
        label="Contact Name"
        value={input.customer.contactName}
        onChange={(v) => updateField('customer.contactName', v)}
        placeholder="Primary contact for this project"
      />
      <InputField
        label="Email"
        value={input.customer.contactEmail}
        onChange={(v) => updateField('customer.contactEmail', v)}
        type="email"
        placeholder="contact@company.com"
      />
      <InputField
        label="Phone"
        value={input.customer.contactPhone}
        onChange={(v) => updateField('customer.contactPhone', v)}
        placeholder="(555) 123-4567"
      />
      <InputField
        label="Billing Address"
        value={input.customer.billingAddress}
        onChange={(v) => updateField('customer.billingAddress', v)}
        placeholder="Full billing address"
        colSpan={3}
      />
    </FormGrid>
  );
}

export const CUSTOMER_REQUIRED_FIELDS = ['customer.companyName'];

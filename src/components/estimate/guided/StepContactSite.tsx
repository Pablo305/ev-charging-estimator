'use client';

import { useCallback } from 'react';
import { useEstimate } from '@/contexts/EstimateContext';
import { InputField } from '@/components/estimate/FormField';
import { AddressSearch } from '@/components/map/AddressSearch';
import { extractStateFromAddress } from '@/lib/map/takeoff';

export function StepContactSite() {
  const { input, updateField } = useEstimate();

  const handleAddressSelect = useCallback(
    (address: string, coordinates: [number, number]) => {
      updateField('site.address', address);
      updateField('mapWorkspace.siteCoordinates', coordinates);

      const state = extractStateFromAddress(address);
      if (state) {
        updateField('site.state', state);
      }
    },
    [updateField],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Contact &amp; Site</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter the client contact details and job site address.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          label="Contact Name"
          value={input.customer.contactName}
          onChange={(v) => updateField('customer.contactName', v)}
          required
          placeholder="e.g. Jane Doe"
        />

        <div className="sm:col-span-2">
          <AddressSearch
            onAddressSelect={handleAddressSelect}
            initialAddress={input.site.address}
          />
        </div>

        <InputField
          label="Phone"
          value={input.customer.contactPhone}
          onChange={(v) => updateField('customer.contactPhone', v)}
          placeholder="e.g. (555) 123-4567"
        />
        <InputField
          label="Email"
          value={input.customer.contactEmail}
          onChange={(v) => updateField('customer.contactEmail', v)}
          type="email"
          placeholder="e.g. jane@company.com"
        />
      </div>
    </div>
  );
}

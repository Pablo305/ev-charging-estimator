'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { InputField, SelectField, FormGrid } from '../FormField';

const SITE_TYPES = [
  'airport', 'apartment', 'event_venue', 'fleet_dealer', 'hospital', 'hotel',
  'industrial', 'mixed_use', 'fuel_station', 'municipal', 'office',
  'parking_structure', 'police_gov', 'recreational', 'campground',
  'restaurant', 'retail', 'school', 'other',
].map((v) => ({ value: v, label: v.replace(/_/g, ' ') }));

export function SiteSection() {
  const { input, updateField } = useEstimate();

  return (
    <FormGrid>
      <InputField
        label="Site Address"
        value={input.site.address}
        onChange={(v) => updateField('site.address', v)}
        required
        placeholder="Full installation address"
        hint="Where the chargers will be installed"
        colSpan={3}
      />
      <SelectField
        label="Site Type"
        value={input.site.siteType}
        onChange={(v) => updateField('site.siteType', v)}
        options={SITE_TYPES}
      />
      <InputField
        label="State"
        value={input.site.state}
        onChange={(v) => updateField('site.state', v.toUpperCase())}
        required
        placeholder="FL"
        maxLength={2}
        hint="2-letter code (affects tax/permit rules)"
      />
    </FormGrid>
  );
}

export const SITE_REQUIRED_FIELDS = ['site.address', 'site.state'];

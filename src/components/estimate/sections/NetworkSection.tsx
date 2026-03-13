'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { SelectField, FormGrid } from '../FormField';

const NETWORK_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'customer_lan', label: 'Customer LAN' },
  { value: 'wifi_bridge', label: 'WiFi Bridge' },
  { value: 'cellular_router', label: 'Cellular Router' },
  { value: 'included_in_package', label: 'Included in Package' },
];

const WIFI_RESPONSIBILITY = [
  { value: 'bullet', label: 'Bullet' },
  { value: 'client', label: 'Client' },
  { value: 'na', label: 'N/A' },
  { value: 'tbd', label: 'TBD' },
];

export function NetworkSection() {
  const { input, updateField } = useEstimate();

  return (
    <FormGrid>
      <SelectField label="Network Type" value={input.network.type} onChange={(v) => updateField('network.type', v)} options={NETWORK_TYPES} placeholder="-- Unknown --" />
      <SelectField label="WiFi Install Responsibility" value={input.network.wifiInstallResponsibility} onChange={(v) => updateField('network.wifiInstallResponsibility', v)} options={WIFI_RESPONSIBILITY} placeholder="-- N/A --" />
    </FormGrid>
  );
}

export const NETWORK_REQUIRED_FIELDS: string[] = [];

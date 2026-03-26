'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { InputField, SelectField, FormGrid } from '../FormField';
import { NudgeBanner } from '../NudgeBanner';
import { MapBadge } from '../MapBadge';

const CHARGING_LEVELS = [
  { value: 'l2', label: 'Level 2 (up to 19.2 kW)' },
  { value: 'l3_dcfc', label: 'Level 3 / DCFC (50+ kW)' },
];

const MOUNT_TYPES = [
  { value: 'pedestal', label: 'Pedestal' },
  { value: 'wall', label: 'Wall' },
  { value: 'mix', label: 'Mix' },
  { value: 'other', label: 'Other' },
];

const PORT_TYPES = [
  { value: 'single', label: 'Single' },
  { value: 'dual', label: 'Dual' },
  { value: 'mix', label: 'Mix' },
];

export function ChargerSection() {
  const { input, updateField } = useEstimate();
  const c = input.charger;

  return (
    <>
      <NudgeBanner tab="Charger" />
      <div className="mb-5">
        <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.04em]" style={{ color: 'var(--system-blue)' }}>Hardware</p>
        <FormGrid>
          <InputField label="Brand" value={c.brand} onChange={(v) => updateField('charger.brand', v)} required placeholder="e.g. Tesla, ChargePoint, Xeal" hint="Drives equipment pricing from our pricebook" />
          <InputField label="Model" value={c.model} onChange={(v) => updateField('charger.model', v)} placeholder="e.g. Universal Wall Connector, Supercharger, CT4000" hint="Specific model for accurate pricing" />
          <div>
            <InputField label="Count" value={c.count} onChange={(v) => updateField('charger.count', parseInt(v) || 0)} type="number" required min={0} hint="Total number of charger units" />
            {input.mapWorkspace?.chargerCountFromMap != null && input.mapWorkspace.chargerCountFromMap > 0 && (
              <MapBadge label={`${input.mapWorkspace.chargerCountFromMap} from map`} />
            )}
          </div>
          <SelectField label="Charging Level" value={c.chargingLevel} onChange={(v) => updateField('charger.chargingLevel', v)} options={CHARGING_LEVELS} required hint="L2 = residential/workplace, L3 = fast charging" />
          <SelectField label="Customer Supplied?" value={String(c.isCustomerSupplied)} onChange={(v) => updateField('charger.isCustomerSupplied', v === 'true')} options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }]} placeholder="" />
        </FormGrid>
      </div>

      {!c.isCustomerSupplied && (
        <div>
          <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.04em]" style={{ color: '#636366' }}>Configuration</p>
          <FormGrid>
            <SelectField label="Mount Type" value={c.mountType} onChange={(v) => updateField('charger.mountType', v)} options={MOUNT_TYPES} />
            <SelectField label="Port Type" value={c.portType} onChange={(v) => updateField('charger.portType', v)} options={PORT_TYPES} />
            <InputField label="Pedestal Count" value={c.pedestalCount} onChange={(v) => updateField('charger.pedestalCount', parseInt(v) || 0)} type="number" min={0} />
            <InputField label="Amps per Charger" value={c.ampsPerCharger} onChange={(v) => updateField('charger.ampsPerCharger', v ? parseInt(v) : null)} type="number" />
            <InputField label="Volts" value={c.volts} onChange={(v) => updateField('charger.volts', v ? parseInt(v) : null)} type="number" />
          </FormGrid>
        </div>
      )}
    </>
  );
}

export const CHARGER_REQUIRED_FIELDS = ['charger.brand', 'charger.count', 'charger.chargingLevel'];

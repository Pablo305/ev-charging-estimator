'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { SelectField, BoolField, InputField, FormGrid } from '../FormField';
import { NudgeBanner } from '../NudgeBanner';

const PARKING_TYPES = [
  { value: 'surface_lot', label: 'Surface Lot' },
  { value: 'parking_garage', label: 'Parking Garage' },
  { value: 'mixed', label: 'Mixed' },
];

const SURFACE_TYPES = [
  { value: 'asphalt', label: 'Asphalt' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'other', label: 'Other' },
];

const INDOOR_OUTDOOR = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'both', label: 'Both' },
];

export function ParkingSection() {
  const { input, updateField } = useEstimate();
  const pe = input.parkingEnvironment;

  return (
    <>
      <NudgeBanner tab="Parking" />
      <div className="mb-5">
        <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.04em]" style={{ color: 'var(--system-blue)' }}>Environment</p>
        <FormGrid>
          <SelectField label="Parking Type" value={pe.type} onChange={(v) => updateField('parkingEnvironment.type', v)} options={PARKING_TYPES} placeholder="-- Unknown --" />
          <SelectField label="Surface Type" value={pe.surfaceType} onChange={(v) => updateField('parkingEnvironment.surfaceType', v)} options={SURFACE_TYPES} placeholder="-- Unknown --" />
          <SelectField label="Indoor/Outdoor" value={pe.indoorOutdoor} onChange={(v) => updateField('parkingEnvironment.indoorOutdoor', v)} options={INDOOR_OUTDOOR} placeholder="-- Unknown --" />
        </FormGrid>
      </div>

      <div className="mb-5">
        <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.04em]" style={{ color: 'var(--system-orange)' }}>Construction Requirements</p>
        <FormGrid>
          <BoolField label="Trenching Required?" value={pe.trenchingRequired} onChange={(v) => updateField('parkingEnvironment.trenchingRequired', v)} />
          <BoolField label="Boring Required?" value={pe.boringRequired} onChange={(v) => updateField('parkingEnvironment.boringRequired', v)} />
          <BoolField label="Traffic Control?" value={pe.trafficControlRequired} onChange={(v) => updateField('parkingEnvironment.trafficControlRequired', v)} />
          {(pe.type === 'parking_garage' || pe.type === 'mixed') && (
            <>
              <BoolField label="Has PT Slab?" value={pe.hasPTSlab} onChange={(v) => updateField('parkingEnvironment.hasPTSlab', v)} />
              <BoolField label="Coring Required?" value={pe.coringRequired} onChange={(v) => updateField('parkingEnvironment.coringRequired', v)} />
              <BoolField label="Fire-Rated Penetrations?" value={pe.fireRatedPenetrations} onChange={(v) => updateField('parkingEnvironment.fireRatedPenetrations', v)} />
            </>
          )}
          <InputField label="Access Restrictions" value={pe.accessRestrictions} onChange={(v) => updateField('parkingEnvironment.accessRestrictions', v)} colSpan={3} />
        </FormGrid>
      </div>
    </>
  );
}

export const PARKING_REQUIRED_FIELDS: string[] = [];

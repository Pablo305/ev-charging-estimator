'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { InputField, SelectField, FormGrid } from '../FormField';

const PROJECT_TYPES = [
  { value: 'full_turnkey', label: 'Full Turnkey' },
  { value: 'full_turnkey_connectivity', label: 'Full Turnkey + Connectivity' },
  { value: 'equipment_install_commission', label: 'Equipment + Install + Commission' },
  { value: 'install_commission', label: 'Install & Commission' },
  { value: 'equipment_purchase', label: 'Equipment Purchase' },
  { value: 'remove_replace', label: 'Remove & Replace' },
  { value: 'commission_only', label: 'Commission Only' },
  { value: 'service_work', label: 'Service Work' },
  { value: 'supercharger', label: 'Supercharger' },
] as const;

const NEW_CONSTRUCTION_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
] as const;

export function ProjectSection() {
  const { input, updateField } = useEstimate();

  return (
    <FormGrid>
      <InputField
        label="Project Name"
        value={input.project.name}
        onChange={(v) => updateField('project.name', v)}
        required
        placeholder="e.g. Hampton Inn Miami - EV Charging"
        hint="Used as the estimate title"
      />
      <InputField
        label="Sales Rep"
        value={input.project.salesRep}
        onChange={(v) => updateField('project.salesRep', v)}
        placeholder="Name of sales representative"
      />
      <SelectField
        label="Project Type"
        value={input.project.projectType}
        onChange={(v) => updateField('project.projectType', v ?? 'full_turnkey')}
        options={PROJECT_TYPES}
        required
        hint="Determines which line items are included"
      />
      <InputField
        label="Timeline"
        value={input.project.timeline}
        onChange={(v) => updateField('project.timeline', v)}
        placeholder="e.g. Q2 2026, ASAP, 6-8 weeks"
      />
      <SelectField
        label="New Construction?"
        value={input.project.isNewConstruction === null ? null : String(input.project.isNewConstruction)}
        onChange={(v) => updateField('project.isNewConstruction', v === null ? null : v === 'true')}
        options={NEW_CONSTRUCTION_OPTIONS}
        placeholder="Unknown"
        hint="New construction may reduce civil/trenching costs"
      />
    </FormGrid>
  );
}

export const PROJECT_REQUIRED_FIELDS = ['project.name', 'project.projectType'];

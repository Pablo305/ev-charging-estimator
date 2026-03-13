'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { TextareaField } from '../FormField';

export function CivilSection() {
  const { input, updateField } = useEstimate();

  return (
    <div>
      <TextareaField
        label="Installation Location Description"
        value={input.civil.installationLocationDescription}
        onChange={(v) => updateField('civil.installationLocationDescription', v)}
        placeholder="Describe the physical installation area — parking layout, distance from electrical room, any obstacles, surface conditions, etc."
        hint="The more detail you provide, the more accurate the civil/site work estimate will be"
        rows={5}
      />
    </div>
  );
}

export const CIVIL_REQUIRED_FIELDS: string[] = [];

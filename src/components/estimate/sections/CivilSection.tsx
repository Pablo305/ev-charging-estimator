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
      {input.mapWorkspace && (input.mapWorkspace.trenchingDistance_ft || input.mapWorkspace.boringDistance_ft || input.mapWorkspace.concreteCuttingDistance_ft) && (
        <div className="mt-4 rounded-[var(--radius-sm)] border-0 bg-[rgba(0,122,255,0.04)] px-4 py-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.04em]" style={{ color: 'var(--system-blue)' }}>Map-Derived Civil Data</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {input.mapWorkspace.trenchingDistance_ft != null && (
              <span className="inline-flex rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(217,119,6,0.08)', color: '#D97706' }}>
                Trench: {input.mapWorkspace.trenchingDistance_ft} ft
              </span>
            )}
            {input.mapWorkspace.boringDistance_ft != null && (
              <span className="inline-flex rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}>
                Bore: {input.mapWorkspace.boringDistance_ft} ft
              </span>
            )}
            {input.mapWorkspace.concreteCuttingDistance_ft != null && (
              <span className="inline-flex rounded-full px-3 py-1 text-[0.75rem] font-medium" style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
                Concrete cut: {input.mapWorkspace.concreteCuttingDistance_ft} ft
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[0.6875rem] text-gray-400">These values are from the Map Workspace and override form values in the estimate engine.</p>
        </div>
      )}
    </div>
  );
}

export const CIVIL_REQUIRED_FIELDS: string[] = [];

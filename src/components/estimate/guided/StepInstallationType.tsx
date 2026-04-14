'use client';

import { useState, useCallback } from 'react';
import { useEstimate } from '@/contexts/EstimateContext';
import {
  INSTALLATION_TYPES,
  getTemplateForInstallationType,
  type InstallationType,
} from '@/lib/estimate/guided-flow-config';
import type { EstimateInput } from '@/lib/estimate/types';
import { emptyInput } from '@/lib/estimate/emptyInput';

export function StepInstallationType() {
  const { input, setInput } = useEstimate();

  // Derive selected type from current input
  const [selected, setSelected] = useState<InstallationType | null>(() => {
    const match = INSTALLATION_TYPES.find(
      (t) =>
        t.projectType === input.project.projectType &&
        (t.parkingType === undefined ||
          t.parkingType === null ||
          t.parkingType === input.parkingEnvironment?.type),
    );
    return match?.id ?? null;
  });

  const handleSelect = useCallback(
    (type: InstallationType) => {
      setSelected(type);

      const template = getTemplateForInstallationType(type);
      const base = emptyInput();

      // Start from template prefill (if available), layered on top of empty input
      const prefilled = template?.prefilledInput ?? {};
      const merged = {
        ...base,
        ...prefilled,
        // Preserve user data from steps 1-3
        project: {
          ...(base.project),
          ...(prefilled.project ?? {}),
          name: input.project.name,
          salesRep: input.project.salesRep,
        },
        customer: {
          ...(base.customer),
          ...(prefilled.customer ?? {}),
          companyName: input.customer.companyName,
          contactName: input.customer.contactName,
          contactEmail: input.customer.contactEmail,
          contactPhone: input.customer.contactPhone,
          billingAddress: input.customer.billingAddress,
        },
        site: {
          ...(base.site),
          ...(prefilled.site ?? {}),
          address: input.site.address,
          state: input.site.state,
          siteType: input.site.siteType,
        },
        mapWorkspace: {
          ...(base.mapWorkspace),
          ...(prefilled.mapWorkspace ?? {}),
          siteCoordinates: input.mapWorkspace?.siteCoordinates ?? null,
        },
        purchasingChargers: {
          ...(base.purchasingChargers),
          ...(prefilled.purchasingChargers ?? {}),
          responsibility: input.purchasingChargers.responsibility,
        },
        charger: {
          ...(base.charger),
          ...(prefilled.charger ?? {}),
          count: input.charger.count,
          pedestalCount: input.charger.pedestalCount,
          brand: input.charger.brand,
          model: input.charger.model,
          chargingLevel: input.charger.chargingLevel,
          volts: input.charger.volts,
        },
      };

      setInput(merged as EstimateInput);
    },
    [input, setInput],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Installation Type</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select the type of work for this project. This will pre-fill the estimate template.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {INSTALLATION_TYPES.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                isSelected
                  ? 'border-[var(--system-blue)] bg-[var(--system-blue)]/5'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="mt-0.5 text-xl">{option.icon}</span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    isSelected ? 'text-[var(--system-blue)]' : 'text-gray-900'
                  }`}
                >
                  {option.label}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

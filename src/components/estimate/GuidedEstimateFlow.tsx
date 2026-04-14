'use client';

import { useState, useCallback, useMemo } from 'react';
import { useEstimate } from '@/contexts/EstimateContext';
import { GuidedProgressBar } from './GuidedProgressBar';
import {
  StepRepInfo,
  StepContactSite,
  StepEquipmentPurchase,
  StepInstallationType,
  StepConditionalDetails,
  StepReviewGenerate,
} from './guided';
import {
  INSTALLATION_TYPES,
  getConditionalFields,
  type GuidedStep,
  type InstallationType,
} from '@/lib/estimate/guided-flow-config';

interface GuidedEstimateFlowProps {
  onEstimateGenerated: () => void;
}

export function GuidedEstimateFlow({ onEstimateGenerated }: GuidedEstimateFlowProps) {
  const { input } = useEstimate();
  const [currentStep, setCurrentStep] = useState<GuidedStep>(1);

  // Derive installation type from current input
  const installationType = useMemo((): InstallationType | null => {
    const pt = input.project.projectType;
    const parking = input.parkingEnvironment?.type;

    const match = INSTALLATION_TYPES.find((t) => {
      if (t.projectType !== pt) return false;
      if (t.parkingType !== undefined && t.parkingType !== parking) return false;
      return true;
    });
    return match?.id ?? null;
  }, [input.project.projectType, input.parkingEnvironment?.type]);

  // Track completed steps
  const completedSteps = useMemo(() => {
    const completed = new Set<GuidedStep>();

    // Step 1: Rep & Project - need project name
    if (input.project.name.trim()) completed.add(1);

    // Step 2: Contact & Site - need address
    if (input.site.address.trim()) completed.add(2);

    // Step 3: Equipment - need a selection
    if (input.purchasingChargers.responsibility) completed.add(3);

    // Step 4: Installation type - need a type selected
    if (installationType) completed.add(4);

    // Step 5: Conditional details - check required fields for the type
    if (installationType) {
      const fields = getConditionalFields(installationType);
      const requiredFields = fields.filter((f) => f.required);
      if (requiredFields.length === 0) {
        // No required fields (e.g., service call, equipment purchase)
        completed.add(5);
      } else {
        const allFilled = requiredFields.every((f) => {
          const val = getNestedValue(input as unknown as Record<string, unknown>, f.fieldPath);
          return val !== null && val !== undefined && val !== '';
        });
        if (allFilled) completed.add(5);
      }
    }

    return completed;
  }, [input, installationType]);

  const canAdvance = useCallback((step: GuidedStep): boolean => {
    switch (step) {
      case 1: return !!input.project.name.trim();
      case 2: return !!input.site.address.trim();
      case 3: return !!input.purchasingChargers.responsibility;
      case 4: return !!installationType;
      case 5: return completedSteps.has(5);
      default: return true;
    }
  }, [input, installationType, completedSteps]);

  const handleNext = useCallback(() => {
    if (currentStep < 6 && canAdvance(currentStep)) {
      // Skip step 5 for types with no conditional fields
      if (currentStep === 4 && installationType) {
        const fields = getConditionalFields(installationType);
        if (fields.length === 0) {
          setCurrentStep(6);
          return;
        }
      }
      setCurrentStep((s) => Math.min(6, s + 1) as GuidedStep);
    }
  }, [currentStep, canAdvance, installationType]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      // Skip step 5 going back if no conditional fields
      if (currentStep === 6 && installationType) {
        const fields = getConditionalFields(installationType);
        if (fields.length === 0) {
          setCurrentStep(4);
          return;
        }
      }
      setCurrentStep((s) => Math.max(1, s - 1) as GuidedStep);
    }
  }, [currentStep, installationType]);

  return (
    <div className="max-w-2xl mx-auto">
      <GuidedProgressBar
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={setCurrentStep}
      />

      <div className="mt-4">
        {/* Step card */}
        <div className="rounded-2xl border border-black/[0.06] bg-white/80 backdrop-blur-sm p-6 shadow-sm">
          {currentStep === 1 && <StepRepInfo />}
          {currentStep === 2 && <StepContactSite />}
          {currentStep === 3 && <StepEquipmentPurchase />}
          {currentStep === 4 && <StepInstallationType />}
          {currentStep === 5 && installationType && (
            <StepConditionalDetails installationType={installationType} />
          )}
          {currentStep === 6 && (
            <StepReviewGenerate onGenerate={onEstimateGenerated} />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center mt-6 px-1">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`
              px-5 py-2.5 rounded-lg text-sm font-medium transition-all
              ${currentStep === 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            &larr; Back
          </button>

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance(currentStep)}
              className={`
                px-6 py-2.5 rounded-lg text-sm font-semibold transition-all
                ${canAdvance(currentStep)
                  ? 'bg-[#13b3cf] text-white hover:bg-[#0e9ab3] shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              Next &rarr;
            </button>
          ) : (
            <div /> // Spacer — generate button is inside StepReviewGenerate
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to read a nested value from an object by dot-path
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

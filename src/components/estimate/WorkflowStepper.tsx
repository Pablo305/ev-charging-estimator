'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEstimate } from '@/contexts/EstimateContext';

type StepId = 'map' | 'configure' | 'review';

interface WorkflowStep {
  id: StepId;
  label: string;
  shortLabel: string;
  href: string;
  status: 'not-started' | 'in-progress' | 'complete';
}

function getStepStatus(id: StepId, input: ReturnType<typeof useEstimate>['input'], currentStep: StepId): WorkflowStep['status'] {
  switch (id) {
    case 'map': {
      const hasCoords = !!input.mapWorkspace?.siteCoordinates;
      const hasDrawings = (input.mapWorkspace?.drawings?.runs?.length ?? 0) > 0
        || (input.mapWorkspace?.drawings?.equipment?.length ?? 0) > 0;
      if (hasCoords && hasDrawings) return 'complete';
      if (hasCoords || currentStep === 'map') return 'in-progress';
      return 'not-started';
    }
    case 'configure': {
      // Count required fields filled
      const required = ['project.name', 'project.projectType', 'customer.companyName', 'site.address', 'site.state', 'charger.brand', 'charger.count', 'charger.chargingLevel'];
      let filled = 0;
      for (const path of required) {
        const parts = path.split('.');
        let val: unknown = input;
        for (const p of parts) {
          val = val && typeof val === 'object' ? (val as Record<string, unknown>)[p] : undefined;
        }
        if (val !== null && val !== undefined && val !== '' && val !== 0) filled++;
      }
      const progress = filled / required.length;
      if (progress >= 0.8) return 'complete';
      if (progress > 0 || currentStep === 'configure') return 'in-progress';
      return 'not-started';
    }
    case 'review':
      return 'not-started'; // Completed externally when estimate is generated
    default:
      return 'not-started';
  }
}

const STEP_ICON: Record<WorkflowStep['status'], string> = {
  'complete': '\u2713',
  'in-progress': '\u2022',
  'not-started': '\u00B7',
};

export function WorkflowStepper() {
  const pathname = usePathname();
  const { input } = useEstimate();

  const currentStep: StepId = pathname?.includes('/estimate/map') ? 'map' : 'configure';

  const steps: WorkflowStep[] = [
    {
      id: 'map',
      label: 'Site & Map',
      shortLabel: 'Map',
      href: '/estimate/map',
      status: getStepStatus('map', input, currentStep),
    },
    {
      id: 'configure',
      label: 'Configure Estimate',
      shortLabel: 'Config',
      href: '/estimate',
      status: getStepStatus('configure', input, currentStep),
    },
    {
      id: 'review',
      label: 'Review & Export',
      shortLabel: 'Export',
      href: '/estimate#results',
      status: getStepStatus('review', input, currentStep),
    },
  ];

  // Quick stats
  const drawingCount = (input.mapWorkspace?.drawings?.runs?.length ?? 0)
    + (input.mapWorkspace?.drawings?.equipment?.length ?? 0);

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-2">
        {/* Steps */}
        <div className="flex items-center gap-1">
          {steps.map((step, i) => {
            const isActive = step.id === currentStep;
            const statusColors = {
              'complete': 'bg-green-100 text-green-700 border-green-200',
              'in-progress': isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-200',
              'not-started': 'bg-gray-50 text-gray-400 border-gray-200',
            };

            return (
              <div key={step.id} className="flex items-center">
                {i > 0 && (
                  <div className={`mx-1.5 h-px w-6 ${
                    steps[i - 1].status === 'complete' ? 'bg-green-300' : 'bg-gray-200'
                  }`} />
                )}
                <Link
                  href={step.href}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all hover:shadow-sm ${statusColors[step.status]}`}
                >
                  <span className="text-[10px] font-bold">
                    {step.status === 'complete' ? STEP_ICON.complete : (i + 1)}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.shortLabel}</span>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Quick status */}
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          {drawingCount > 0 && (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">
              {drawingCount} drawing{drawingCount !== 1 ? 's' : ''}
            </span>
          )}
          {input.site.address && (
            <span className="hidden truncate sm:inline" style={{ maxWidth: 180 }}>
              {input.site.address}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

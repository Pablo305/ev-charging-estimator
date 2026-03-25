import type { ReactNode } from 'react';
import { WorkflowStepper } from '@/components/estimate/WorkflowStepper';

export default function EstimateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <WorkflowStepper />
      <div className="flex-1">{children}</div>
    </div>
  );
}

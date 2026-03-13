'use client';

import { ReactNode } from 'react';
import { ViewModeProvider } from '@/lib/viewMode';
import { EstimateProvider } from '@/contexts/EstimateContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ViewModeProvider>
      <EstimateProvider>{children}</EstimateProvider>
    </ViewModeProvider>
  );
}

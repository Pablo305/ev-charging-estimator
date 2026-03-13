'use client';

import { useState, useCallback } from 'react';
import { useEstimate } from '@/contexts/EstimateContext';

interface SuggestedChange {
  readonly fieldPath: string;
  readonly value: unknown;
  readonly label: string;
}

// Only allow chat to modify safe, non-financial fields
const ALLOWED_CHAT_FIELD_PATHS = new Set([
  'charger.brand', 'charger.model', 'charger.count', 'charger.chargingLevel',
  'charger.mountType', 'charger.portType', 'charger.pedestalCount',
  'site.siteType', 'site.state', 'site.address',
  'project.projectType', 'project.name', 'project.timeline',
  'parkingEnvironment.type', 'parkingEnvironment.surfaceType',
  'parkingEnvironment.indoorOutdoor',
  'electrical.serviceType', 'network.type',
  'customer.companyName',
]);

interface ChatActionButtonProps {
  readonly change: SuggestedChange;
}

export function ChatActionButton({ change }: ChatActionButtonProps) {
  const { updateField } = useEstimate();
  const [applied, setApplied] = useState(false);

  const isAllowed = ALLOWED_CHAT_FIELD_PATHS.has(change.fieldPath);

  const handleApply = useCallback(() => {
    if (!isAllowed) {
      console.warn('Blocked disallowed fieldPath from chat:', change.fieldPath);
      return;
    }
    updateField(change.fieldPath, change.value);
    setApplied(true);
  }, [updateField, change, isAllowed]);

  if (!isAllowed) return null;

  if (applied) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Applied
      </span>
    );
  }

  return (
    <button
      onClick={handleApply}
      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-200"
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      {change.label}
    </button>
  );
}

interface ChatActionGroupProps {
  readonly changes: readonly SuggestedChange[];
}

export function ChatActionGroup({ changes }: ChatActionGroupProps) {
  if (changes.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {changes.map((change, i) => (
        <ChatActionButton key={`${change.fieldPath}-${i}`} change={change} />
      ))}
    </div>
  );
}

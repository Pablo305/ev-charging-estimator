'use client';

/**
 * Small badge indicating a field value was set from the map workspace.
 * Shows a blue map pin icon + "From Map" text.
 */
export function MapBadge({ label }: { label?: string }) {
  return (
    <span
      className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 ring-1 ring-blue-200"
      title="This value was set from the Map Workspace"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      {label ?? 'From Map'}
    </span>
  );
}

'use client';

import { useCallback, useEffect } from 'react';
import type { RunType, EquipmentType, PointToolType } from '@/lib/map/types';
import { RUN_TYPE_CONFIG, EQUIPMENT_TYPE_CONFIG } from '@/lib/map/constants';

type ToolType = RunType | EquipmentType | PointToolType | null;

interface DrawingToolbarProps {
  selectedTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

export function DrawingToolbar({ selectedTool, onSelectTool }: DrawingToolbarProps) {
  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toUpperCase();

      // Run type shortcuts
      for (const [runType, config] of Object.entries(RUN_TYPE_CONFIG)) {
        if (config.shortcut === key) {
          onSelectTool(selectedTool === runType ? null : (runType as RunType));
          return;
        }
      }

      // Equipment type shortcuts
      for (const [eqType, config] of Object.entries(EQUIPMENT_TYPE_CONFIG)) {
        if (config.shortcut === key) {
          onSelectTool(selectedTool === eqType ? null : (eqType as EquipmentType));
          return;
        }
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        onSelectTool(null);
      }
    },
    [selectedTool, onSelectTool],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
      <div className="px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Runs
      </div>
      {(Object.entries(RUN_TYPE_CONFIG) as [RunType, typeof RUN_TYPE_CONFIG[RunType]][]).map(
        ([type, config]) => (
          <button
            key={type}
            onClick={() => onSelectTool(selectedTool === type ? null : type)}
            className={`flex items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
              selectedTool === type
                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-300'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
            title={`${config.description} (${config.shortcut})`}
          >
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: config.color }}
            />
            <span className="flex-1">{config.label}</span>
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
              {config.shortcut}
            </kbd>
          </button>
        ),
      )}

      <div className="mt-2 border-t border-gray-100 pt-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Equipment
      </div>
      {(
        Object.entries(EQUIPMENT_TYPE_CONFIG) as [
          EquipmentType,
          typeof EQUIPMENT_TYPE_CONFIG[EquipmentType],
        ][]
      ).map(([type, config]) => (
        <button
          key={type}
          onClick={() => onSelectTool(selectedTool === type ? null : type)}
          className={`flex items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
            selectedTool === type
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-300'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
          title={`Place ${config.label} (${config.shortcut})`}
        >
          <span className="text-base">{config.icon}</span>
          <span className="flex-1">{config.label}</span>
          <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
            {config.shortcut}
          </kbd>
        </button>
      ))}

      {selectedTool && (
        <button
          onClick={() => onSelectTool(null)}
          className="mt-1 rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200"
        >
          Cancel (Esc)
        </button>
      )}
    </div>
  );
}

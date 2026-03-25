'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RunType, EquipmentType, PointToolType } from '@/lib/map/types';
import { RUN_TYPE_CONFIG, EQUIPMENT_TYPE_CONFIG } from '@/lib/map/constants';
import { EquipmentIcon } from './EquipmentIcons';

type ToolType = RunType | EquipmentType | PointToolType | null;

interface DrawingToolbarProps {
  selectedTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onClearAll: () => void;
  onUndo: () => void;
}

export function DrawingToolbar({ selectedTool, onSelectTool, onClearAll, onUndo }: DrawingToolbarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'runs' | 'equipment' | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toUpperCase();

      for (const [runType, config] of Object.entries(RUN_TYPE_CONFIG)) {
        if (config.shortcut === key) {
          onSelectTool(selectedTool === runType ? null : (runType as RunType));
          return;
        }
      }

      for (const [eqType, config] of Object.entries(EQUIPMENT_TYPE_CONFIG)) {
        if (config.shortcut === key) {
          onSelectTool(selectedTool === eqType ? null : (eqType as EquipmentType));
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && key === 'Z') {
        onUndo();
        return;
      }

      if (e.key === 'Escape') {
        onSelectTool(null);
      }
    },
    [selectedTool, onSelectTool, onUndo],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-expand the section containing the selected tool
  useEffect(() => {
    if (!selectedTool) return;
    if (Object.keys(RUN_TYPE_CONFIG).includes(selectedTool)) {
      setExpandedSection('runs');
      setCollapsed(false);
    } else if (Object.keys(EQUIPMENT_TYPE_CONFIG).includes(selectedTool)) {
      setExpandedSection('equipment');
      setCollapsed(false);
    }
  }, [selectedTool]);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-md ring-1 ring-black/5 hover:bg-gray-50 transition"
        title="Show drawing tools"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      </button>
    );
  }

  const toggleSection = (section: 'runs' | 'equipment') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="flex flex-col rounded-lg bg-white/95 shadow-md ring-1 ring-black/5 backdrop-blur-sm" style={{ maxWidth: '200px' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Tools</span>
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          title="Collapse toolbar"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 2 L8 8 M8 2 L2 8" />
          </svg>
        </button>
      </div>

      {/* Runs Section */}
      <div>
        <button
          onClick={() => toggleSection('runs')}
          className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left hover:bg-gray-50 transition"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 8 L5 4 L8 6 L11 2" />
          </svg>
          <span className="flex-1 text-[11px] font-medium text-gray-600">Runs</span>
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#9CA3AF" strokeWidth="1.5"
            className={`transition-transform ${expandedSection === 'runs' ? 'rotate-180' : ''}`}
          >
            <path d="M2 4 L5 7 L8 4" />
          </svg>
        </button>

        {expandedSection === 'runs' && (
          <div className="border-t border-gray-50 px-1 pb-1">
            {(Object.entries(RUN_TYPE_CONFIG) as [RunType, typeof RUN_TYPE_CONFIG[RunType]][]).map(
              ([type, config]) => (
                <button
                  key={type}
                  onClick={() => onSelectTool(selectedTool === type ? null : type)}
                  className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left transition-colors ${
                    selectedTool === type
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title={`${config.description} (${config.shortcut})`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="flex-1 truncate text-[11px]">{config.label}</span>
                  <kbd className="rounded bg-gray-100 px-1 py-px text-[9px] text-gray-400">
                    {config.shortcut}
                  </kbd>
                </button>
              ),
            )}
          </div>
        )}
      </div>

      {/* Equipment Section */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => toggleSection('equipment')}
          className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left hover:bg-gray-50 transition"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round">
            <rect x="2" y="2" width="8" height="8" rx="1" />
            <path d="M6 4 L5 6 L7 6 L6 8" />
          </svg>
          <span className="flex-1 text-[11px] font-medium text-gray-600">Equipment</span>
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#9CA3AF" strokeWidth="1.5"
            className={`transition-transform ${expandedSection === 'equipment' ? 'rotate-180' : ''}`}
          >
            <path d="M2 4 L5 7 L8 4" />
          </svg>
        </button>

        {expandedSection === 'equipment' && (
          <div className="border-t border-gray-50 px-1 pb-1">
            {(
              Object.entries(EQUIPMENT_TYPE_CONFIG) as [
                EquipmentType,
                typeof EQUIPMENT_TYPE_CONFIG[EquipmentType],
              ][]
            ).map(([type, config]) => (
              <button
                key={type}
                onClick={() => onSelectTool(selectedTool === type ? null : type)}
                className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left transition-colors ${
                  selectedTool === type
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                title={`Place ${config.label} (${config.shortcut})`}
              >
                <span className="shrink-0">
                  <EquipmentIcon type={type} size={18} />
                </span>
                <span className="flex-1 truncate text-[11px]">{config.label}</span>
                <kbd className="rounded bg-gray-100 px-1 py-px text-[9px] text-gray-400">
                  {config.shortcut}
                </kbd>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active tool cancel */}
      {selectedTool && (
        <div className="border-t border-gray-100 px-1.5 py-1">
          <button
            onClick={() => onSelectTool(null)}
            className="w-full rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-200 transition"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1 border-t border-gray-100 px-1.5 py-1">
        <button
          onClick={onUndo}
          className="flex-1 rounded bg-gray-50 px-1.5 py-1 text-[10px] text-gray-500 hover:bg-gray-100 transition"
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          onClick={() => {
            if (window.confirm('Clear all drawings, equipment, and runs from the map?')) {
              onClearAll();
            }
          }}
          className="flex-1 rounded bg-red-50 px-1.5 py-1 text-[10px] text-red-500 hover:bg-red-100 transition"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

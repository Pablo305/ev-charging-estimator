'use client';

import { useEstimate } from '@/contexts/EstimateContext';
import { InputField, SelectField } from '@/components/estimate/FormField';
import {
  getConditionalFields,
  getTemplateForInstallationType,
  hasMapFields,
  type InstallationType,
  type ConditionalField,
} from '@/lib/estimate/guided-flow-config';
import { InlineMapPrompt } from './InlineMapPrompt';

interface StepConditionalDetailsProps {
  installationType: InstallationType;
}

/** Safely read a nested value from an object using a dot-separated path. */
function readPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function RadioPills({
  field,
  value,
  onChange,
}: {
  field: ConditionalField;
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1.5">
        {field.label}
        {field.mapDerived && (
          <span className="ml-1.5 inline-flex items-center rounded bg-[var(--system-blue)]/10 px-1.5 py-0.5 text-[0.625rem] font-semibold text-[var(--system-blue)]">
            Map
          </span>
        )}
      </label>
      <div className="flex gap-3">
        {(field.options ?? []).map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                isSelected
                  ? 'border-[var(--system-blue)] bg-[var(--system-blue)]/5 text-[var(--system-blue)]'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {field.hint && (
        <p className="mt-1.5 text-[0.6875rem] text-gray-400">{field.hint}</p>
      )}
    </div>
  );
}

export function StepConditionalDetails({ installationType }: StepConditionalDetailsProps) {
  const { input, updateField } = useEstimate();
  const fields = getConditionalFields(installationType);

  if (fields.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Additional Details</h2>
          <p className="mt-1 text-sm text-gray-500">
            No additional details required for this installation type.
          </p>
        </div>
      </div>
    );
  }

  const inputRecord = input as unknown as Record<string, unknown>;
  const padRequired = input.accessories?.padRequired;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Additional Details</h2>
        <p className="mt-1 text-sm text-gray-500">
          Provide specifics for this installation type. Fields marked with a{' '}
          <span className="inline-flex items-center rounded bg-[var(--system-blue)]/10 px-1.5 py-0.5 text-[0.625rem] font-semibold text-[var(--system-blue)]">
            Map
          </span>{' '}
          badge can be auto-measured from the satellite map.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          // Hide numConcretePads unless pads are required
          if (field.id === 'numConcretePads' && !padRequired) {
            return null;
          }

          const currentValue = readPath(inputRecord, field.fieldPath);

          if (field.inputType === 'radio') {
            const strVal =
              currentValue === true
                ? 'true'
                : currentValue === false
                  ? 'false'
                  : currentValue != null
                    ? String(currentValue)
                    : null;

            return (
              <div key={field.id} className="sm:col-span-2">
                <RadioPills
                  field={field}
                  value={strVal}
                  onChange={(v) => {
                    // Convert 'true'/'false' strings to booleans for boolean fields
                    if (v === 'true') {
                      updateField(field.fieldPath, true);
                    } else if (v === 'false') {
                      updateField(field.fieldPath, false);
                    } else {
                      updateField(field.fieldPath, v);
                    }
                  }}
                />
              </div>
            );
          }

          if (field.inputType === 'select') {
            // For installCommType, read the compound value from mountType+portType
            let selectValue = currentValue != null ? String(currentValue) : null;
            if (field.id === 'installCommType') {
              const mt = input.charger?.mountType;
              const pt = input.charger?.portType;
              if (mt && pt) {
                selectValue = `${mt}_${pt}`;
              }
            }

            return (
              <SelectField
                key={field.id}
                label={
                  field.label +
                  (field.mapDerived ? ' \u00B7 Map' : '')
                }
                value={selectValue}
                onChange={(v) => {
                  // Handle compound mount type values (e.g. 'pedestal_single')
                  if (field.id === 'installCommType') {
                    if (v === 'pedestal_single') {
                      updateField('charger.mountType', 'pedestal');
                      updateField('charger.portType', 'single');
                    } else if (v === 'wall_single') {
                      updateField('charger.mountType', 'wall');
                      updateField('charger.portType', 'single');
                    } else if (v === 'pedestal_dual') {
                      updateField('charger.mountType', 'pedestal');
                      updateField('charger.portType', 'dual');
                    }
                    return;
                  }
                  // For number-typed selects (like supercharger count), parse as number
                  if (field.fieldPath.includes('count') || field.fieldPath.includes('Count')) {
                    updateField(field.fieldPath, v != null ? parseInt(v, 10) : 0);
                    return;
                  }
                  updateField(field.fieldPath, v);
                }}
                options={field.options ?? []}
                required={field.required}
                hint={field.hint}
                placeholder={field.placeholder}
              />
            );
          }

          // number or text input
          return (
            <div key={field.id}>
              <InputField
                label={field.label}
                value={currentValue != null ? currentValue as string | number : ''}
                onChange={(v) => {
                  if (field.inputType === 'number') {
                    // For the numRemoved field, store as a note string
                    if (field.id === 'numRemoved') {
                      const count = v === '' ? 0 : Number(v);
                      updateField(field.fieldPath, `Chargers removed: ${count}`);
                      return;
                    }
                    updateField(field.fieldPath, v === '' ? 0 : parseFloat(String(v)) || 0);
                  } else {
                    updateField(field.fieldPath, v);
                  }
                }}
                type={field.inputType === 'number' ? 'number' : 'text'}
                required={field.required}
                min={field.min}
                max={field.max}
                placeholder={field.placeholder}
                hint={
                  (field.mapDerived ? '[Map-derived] ' : '') + (field.hint ?? '')
                }
              />
              {field.mapDerived && (
                <p className="mt-1 text-[0.625rem] text-[var(--system-blue)]">
                  {field.mapPrompt ?? 'Draw on the satellite map to auto-measure'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Inline map prompt for map-derived fields */}
      {hasMapFields(installationType) && input.mapWorkspace?.siteCoordinates != null && (() => {
        const mapFields = fields.filter((f) => f.mapDerived);
        const template = getTemplateForInstallationType(installationType);
        return (
          <InlineMapPrompt
            fields={mapFields}
            suggestedTools={template?.suggestedMapTools ?? []}
          />
        );
      })()}
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';

const baseCls = 'block w-full rounded-[var(--radius-sm)] border-0 bg-black/[0.03] px-3.5 py-2.5 text-sm text-gray-900 ring-1 ring-inset ring-black/[0.06] placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[var(--system-blue)] transition-shadow';
const requiredCls = `${baseCls} ring-[var(--system-blue)]/30`;
const labelCls = 'block text-[0.8125rem] font-medium text-gray-700 mb-1.5';
const requiredLabelCls = `${labelCls} after:content-["*"] after:ml-0.5 after:text-[var(--system-blue)]`;
const hintCls = 'mt-1.5 text-[0.6875rem] text-gray-400';

interface InputFieldProps {
  label: string;
  value: string | number | null;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'email';
  required?: boolean;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  colSpan?: 2 | 3;
  aiSuggested?: boolean;
  error?: string;
  disabled?: boolean;
  id?: string;
}

export function InputField({
  label, value, onChange, type = 'text', required, placeholder, hint, min, max, step, maxLength, colSpan, aiSuggested,
  error, disabled, id,
}: InputFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const spanCls = colSpan === 3 ? 'sm:col-span-2 lg:col-span-3' : colSpan === 2 ? 'sm:col-span-2' : '';
  const inputCls = `${required ? requiredCls : baseCls}${error ? ' ring-[var(--system-red)]/40' : ''}`;
  return (
    <div className={spanCls}>
      <label htmlFor={fieldId} className={required ? requiredLabelCls : labelCls}>
        {label}
        {aiSuggested && <span className="ml-1 text-[var(--system-purple)]" title="AI suggested">&#10024;</span>}
      </label>
      <input
        id={fieldId}
        className={inputCls}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
      />
      {error && <p id={`${fieldId}-error`} className="mt-1.5 text-[0.6875rem]" style={{ color: 'var(--system-red)' }}>{error}</p>}
      {hint && <p id={`${fieldId}-hint`} className={hintCls}>{hint}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: readonly { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
  colSpan?: 2 | 3;
  aiSuggested?: boolean;
  error?: string;
  disabled?: boolean;
  id?: string;
}

export function SelectField({
  label, value, onChange, options, required, hint, placeholder, colSpan, aiSuggested,
  error, disabled, id,
}: SelectFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const spanCls = colSpan === 3 ? 'sm:col-span-2 lg:col-span-3' : colSpan === 2 ? 'sm:col-span-2' : '';
  const selectCls = `${required ? requiredCls : baseCls}${error ? ' ring-[var(--system-red)]/40' : ''}`;
  return (
    <div className={spanCls}>
      <label htmlFor={fieldId} className={required ? requiredLabelCls : labelCls}>
        {label}
        {aiSuggested && <span className="ml-1 text-[var(--system-purple)]" title="AI suggested">&#10024;</span>}
      </label>
      <select
        id={fieldId}
        className={selectCls}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
      >
        <option value="">{placeholder ?? '-- Select --'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p id={`${fieldId}-error`} className="mt-1.5 text-[0.6875rem]" style={{ color: 'var(--system-red)' }}>{error}</p>}
      {hint && <p id={`${fieldId}-hint`} className={hintCls}>{hint}</p>}
    </div>
  );
}

interface BoolFieldProps {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  aiSuggested?: boolean;
  disabled?: boolean;
  id?: string;
}

export function BoolField({ label, value, onChange, aiSuggested, disabled, id }: BoolFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return (
    <div>
      <label htmlFor={fieldId} className={labelCls}>
        {label}
        {aiSuggested && <span className="ml-1 text-[var(--system-purple)]" title="AI suggested">&#10024;</span>}
      </label>
      <select
        id={fieldId}
        className={baseCls}
        value={value === null ? 'null' : String(value)}
        onChange={(e) => onChange(e.target.value === 'null' ? null : e.target.value === 'true')}
        disabled={disabled}
      >
        <option value="null">Unknown</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>
  );
}

interface TextareaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
  colSpan?: 2 | 3;
  error?: string;
  disabled?: boolean;
  id?: string;
}

export function TextareaField({ label, value, onChange, placeholder, hint, rows = 4, colSpan, error, disabled, id }: TextareaFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const spanCls = colSpan === 3 ? 'sm:col-span-2 lg:col-span-3' : colSpan === 2 ? 'sm:col-span-2' : '';
  const textareaCls = `${baseCls}${error ? ' ring-[var(--system-red)]/40' : ''}`;
  return (
    <div className={spanCls}>
      <label htmlFor={fieldId} className={labelCls}>{label}</label>
      <textarea
        id={fieldId}
        className={textareaCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ minHeight: `${rows * 2}rem` }}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
      />
      {error && <p id={`${fieldId}-error`} className="mt-1.5 text-[0.6875rem]" style={{ color: 'var(--system-red)' }}>{error}</p>}
      {hint && <p id={`${fieldId}-hint`} className={hintCls}>{hint}</p>}
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}

export function CheckboxField({ label, checked, onChange, id, disabled }: CheckboxFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return (
    <label htmlFor={fieldId} className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] bg-black/[0.02] px-3.5 py-3 ring-1 ring-inset ring-black/[0.04] transition hover:bg-black/[0.04]">
      <input id={fieldId} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[var(--system-blue)] focus:ring-[var(--system-blue)]" />
      <span className="text-[0.8125rem] font-medium text-gray-700">{label}</span>
    </label>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

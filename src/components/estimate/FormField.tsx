'use client';

import type { ReactNode } from 'react';

const baseCls = 'block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
const requiredCls = `${baseCls} border-l-2 border-l-blue-400`;
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const requiredLabelCls = `${labelCls} after:content-["*"] after:ml-0.5 after:text-blue-500`;
const hintCls = 'mt-1 text-xs text-gray-400';

// ── Text / Number / Email inputs ──

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
}

export function InputField({
  label, value, onChange, type = 'text', required, placeholder, hint, min, max, step, maxLength, colSpan, aiSuggested,
}: InputFieldProps) {
  const spanCls = colSpan === 3 ? 'sm:col-span-2 lg:col-span-3' : colSpan === 2 ? 'sm:col-span-2' : '';
  return (
    <div className={spanCls}>
      <label className={required ? requiredLabelCls : labelCls}>
        {label}
        {aiSuggested && <span className="ml-1 text-purple-500" title="AI suggested">&#10024;</span>}
      </label>
      <input
        className={required ? requiredCls : baseCls}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
      />
      {hint && <p className={hintCls}>{hint}</p>}
    </div>
  );
}

// ── Select dropdown ──

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
}

export function SelectField({
  label, value, onChange, options, required, hint, placeholder, colSpan, aiSuggested,
}: SelectFieldProps) {
  const spanCls = colSpan === 3 ? 'sm:col-span-2 lg:col-span-3' : colSpan === 2 ? 'sm:col-span-2' : '';
  return (
    <div className={spanCls}>
      <label className={required ? requiredLabelCls : labelCls}>
        {label}
        {aiSuggested && <span className="ml-1 text-purple-500" title="AI suggested">&#10024;</span>}
      </label>
      <select
        className={required ? requiredCls : baseCls}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{placeholder ?? '-- Select --'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {hint && <p className={hintCls}>{hint}</p>}
    </div>
  );
}

// ── Boolean (Yes/No/Unknown) ──

interface BoolFieldProps {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  aiSuggested?: boolean;
}

export function BoolField({ label, value, onChange, aiSuggested }: BoolFieldProps) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {aiSuggested && <span className="ml-1 text-purple-500" title="AI suggested">&#10024;</span>}
      </label>
      <select
        className={baseCls}
        value={value === null ? 'null' : String(value)}
        onChange={(e) => onChange(e.target.value === 'null' ? null : e.target.value === 'true')}
      >
        <option value="null">Unknown</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>
  );
}

// ── Textarea ──

interface TextareaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
  colSpan?: 2 | 3;
}

export function TextareaField({ label, value, onChange, placeholder, hint, rows = 4, colSpan }: TextareaFieldProps) {
  const spanCls = colSpan === 3 ? 'sm:col-span-2 lg:col-span-3' : colSpan === 2 ? 'sm:col-span-2' : '';
  return (
    <div className={spanCls}>
      <label className={labelCls}>{label}</label>
      <textarea
        className={`${baseCls} h-${rows * 8}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ minHeight: `${rows * 2}rem` }}
      />
      {hint && <p className={hintCls}>{hint}</p>}
    </div>
  );
}

// ── Checkbox ──

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  );
}

// ── Grid wrapper ──

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

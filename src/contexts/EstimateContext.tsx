'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { EstimateInput } from '@/lib/estimate/types';
import { emptyInput } from '@/lib/estimate/emptyInput';

// ── Storage key ──
const STORAGE_KEY = 'bulletev_estimate_input';
const DEBOUNCE_MS = 300;

// ── Actions ──

type EstimateAction =
  | { type: 'SET_FIELD'; path: string; value: unknown }
  | { type: 'SET_INPUT'; input: EstimateInput }
  | { type: 'APPLY_PATCHES'; patches: ReadonlyArray<{ fieldPath: string; value: unknown }> }
  | { type: 'RESET' }
  | { type: 'LOAD_FROM_STORAGE'; input: EstimateInput };

// ── Deep-set helper (immutable) ──

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function setDeep(obj: EstimateInput, path: string, value: unknown): EstimateInput {
  const parts = path.split('.');
  for (const part of parts) {
    if (DANGEROUS_KEYS.has(part)) {
      console.warn('Blocked unsafe key in setDeep:', path);
      return obj;
    }
  }
  const clone = JSON.parse(JSON.stringify(obj)) as EstimateInput;
  let target: Record<string, unknown> = clone as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    if (target[parts[i]] === undefined || typeof target[parts[i]] !== 'object') return obj;
    target = target[parts[i]] as Record<string, unknown>;
  }
  target[parts[parts.length - 1]] = value;
  return clone;
}

// ── Reducer ──

function estimateReducer(state: EstimateInput, action: EstimateAction): EstimateInput {
  switch (action.type) {
    case 'SET_FIELD':
      return setDeep(state, action.path, action.value);

    case 'SET_INPUT':
      return action.input;

    case 'APPLY_PATCHES': {
      let next = state;
      for (const patch of action.patches) {
        next = setDeep(next, patch.fieldPath, patch.value);
      }
      return next;
    }

    case 'RESET':
      return emptyInput();

    case 'LOAD_FROM_STORAGE':
      return action.input;

    default:
      return state;
  }
}

// ── Context value type ──

interface EstimateContextValue {
  readonly input: EstimateInput;
  readonly dispatch: React.Dispatch<EstimateAction>;
  readonly updateField: (path: string, value: unknown) => void;
  readonly applyPatches: (patches: ReadonlyArray<{ fieldPath: string; value: unknown }>) => void;
  readonly setInput: (input: EstimateInput) => void;
  readonly resetEstimate: () => void;
  readonly lastSavedAt: string | null;
}

const EstimateContext = createContext<EstimateContextValue | null>(null);

// ── Provider ──

export function EstimateProvider({ children }: { children: ReactNode }) {
  const [input, dispatch] = useReducer(estimateReducer, undefined, emptyInput);
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with emptyInput to fill any missing fields from schema changes
        const defaults = emptyInput();
        const data = typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {};
        const defRecord = defaults as unknown as Record<string, unknown>;
        const accRecord = { ...defaults } as unknown as Record<string, unknown>;
        for (const key of Object.keys(defRecord)) {
          const defVal = defRecord[key];
          const storedVal = data[key];
          if (defVal && typeof defVal === 'object' && !Array.isArray(defVal) && storedVal && typeof storedVal === 'object' && !Array.isArray(storedVal)) {
            accRecord[key] = { ...(defVal as object), ...(storedVal as object) };
          } else if (storedVal !== undefined) {
            accRecord[key] = storedVal;
          }
        }
        const merged = accRecord as unknown as EstimateInput;
        dispatch({ type: 'LOAD_FROM_STORAGE', input: merged });
      }
    } catch {
      // ignore parse errors
    }
    setIsHydrated(true);
  }, []);

  // Debounced write to localStorage on every change
  useEffect(() => {
    if (!isHydrated) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
        setLastSavedAt(new Date().toLocaleTimeString());
      } catch {
        // ignore quota errors
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, isHydrated]);

  const updateField = useCallback((path: string, value: unknown) => {
    dispatch({ type: 'SET_FIELD', path, value });
  }, []);

  const applyPatches = useCallback(
    (patches: ReadonlyArray<{ fieldPath: string; value: unknown }>) => {
      dispatch({ type: 'APPLY_PATCHES', patches });
    },
    [],
  );

  const setInput = useCallback((newInput: EstimateInput) => {
    dispatch({ type: 'SET_INPUT', input: newInput });
  }, []);

  const resetEstimate = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const value: EstimateContextValue = {
    input,
    dispatch,
    updateField,
    applyPatches,
    setInput,
    resetEstimate,
    lastSavedAt,
  };

  return (
    <EstimateContext.Provider value={value}>
      {children}
    </EstimateContext.Provider>
  );
}

// ── Hook ──

export function useEstimate(): EstimateContextValue {
  const ctx = useContext(EstimateContext);
  if (!ctx) {
    throw new Error('useEstimate must be used within an EstimateProvider');
  }
  return ctx;
}

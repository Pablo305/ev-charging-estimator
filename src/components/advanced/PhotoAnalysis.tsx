'use client';

import { useState, useRef } from 'react';
import { PhotoAnalysisResponse } from '@/lib/ai/types';

interface PhotoAnalysisProps {
  onApplyFields: (fields: Record<string, unknown>) => void;
}

export function PhotoAnalysis({ onApplyFields }: PhotoAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PhotoAnalysisResponse | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setLoading(true);
    setError('');
    setResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);

      const base64 = dataUrl.split(',')[1];
      const mimeType = file.type;

      try {
        const res = await fetch('/api/ai/analyze-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Analysis failed');
          return;
        }

        setResult(data);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleApply() {
    if (!result?.inferredFields) return;
    const flat = flattenFields(result.inferredFields as Record<string, unknown>);
    onApplyFields(flat);
    setCollapsed(true);
  }

  return (
    <div className="rounded-lg border-2 border-blue-200 bg-white">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="rounded bg-blue-200 px-2 py-0.5 text-xs font-bold text-blue-800">Cam</span>
          <span className="font-medium text-gray-900">Photo Analysis</span>
          {result && <span className="text-xs text-green-600">Analyzed ({Math.round(result.confidence * 100)}%)</span>}
        </div>
        <span className="text-gray-400">{collapsed ? '+' : '-'}</span>
      </button>

      {!collapsed && (
        <div className="border-t border-blue-100 px-4 py-4 space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files[0];
              if (file) handleUpload(file);
            }}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 p-6 cursor-pointer hover:border-blue-400 transition"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Site photo" className="max-h-40 rounded" />
            ) : (
              <>
                <p className="text-sm font-medium text-blue-700">Drop a site photo here</p>
                <p className="text-xs text-gray-500 mt-1">or click to browse (JPEG, PNG, WebP)</p>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />

          {loading && <p className="text-sm text-blue-600">Analyzing photo...</p>}

          {error && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Analysis Results</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApply}
                    className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                  >
                    Apply to Form
                  </button>
                  <button
                    onClick={() => { setResult(null); setPreview(null); }}
                    className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Clear Results
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-700">{result.siteDescription}</p>

              {result.concerns.length > 0 && (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs font-medium text-amber-800">Concerns:</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
                    {result.concerns.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}

              <pre className="max-h-40 overflow-auto rounded bg-gray-900 p-3 text-xs text-green-400">
                {JSON.stringify(result.inferredFields, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function flattenFields(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenFields(value as Record<string, unknown>, fullKey));
    } else if (value !== null && value !== undefined) {
      result[fullKey] = value;
    }
  }
  return result;
}

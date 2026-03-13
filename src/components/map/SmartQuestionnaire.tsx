'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SmartQuestion } from '@/lib/ai/site-assessment-types';

interface SmartQuestionnaireProps {
  questions: readonly SmartQuestion[];
  onAnswer: (fieldPath: string, value: unknown) => void;
  onComplete: () => void;
}

function QuestionCard({
  question,
  onAnswer,
  index,
  total,
}: {
  question: SmartQuestion;
  onAnswer: (value: unknown) => void;
  index: number;
  total: number;
}) {
  const [localValue, setLocalValue] = useState<unknown>(question.aiSuggestion);

  const handleConfirm = useCallback(
    (confirmed: boolean) => {
      onAnswer(confirmed ? question.aiSuggestion : null);
    },
    [onAnswer, question.aiSuggestion],
  );

  const handleSelect = useCallback(
    (value: string) => {
      onAnswer(value);
    },
    [onAnswer],
  );

  const handleNumberSubmit = useCallback(() => {
    if (localValue !== null && localValue !== undefined && localValue !== '') {
      onAnswer(Number(localValue));
    }
  }, [localValue, onAnswer]);

  const priorityConfig = {
    blocking: {
      border: 'border-red-300',
      bg: 'bg-red-50',
      badge: 'bg-red-100 text-red-700',
      label: 'Required',
    },
    important: {
      border: 'border-amber-300',
      bg: 'bg-amber-50',
      badge: 'bg-amber-100 text-amber-700',
      label: 'Important',
    },
    nice_to_have: {
      border: 'border-gray-200',
      bg: 'bg-gray-50',
      badge: 'bg-gray-100 text-gray-600',
      label: 'Optional',
    },
  };

  const config = priorityConfig[question.priority];

  return (
    <div className={`rounded-lg border-2 p-4 transition-all duration-300 ${config.border} ${config.bg}`}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs text-gray-400">Q{index + 1}/{total}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.badge}`}>
              {config.label}
            </span>
          </div>
          <div className="text-sm font-medium text-gray-800">
            {question.question}
          </div>
        </div>
      </div>

      {question.type === 'confirm' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleConfirm(true)}
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 hover:shadow"
          >
            Yes
          </button>
          <button
            onClick={() => handleConfirm(false)}
            className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50"
          >
            No
          </button>
          {question.aiSuggestion !== null && (
            <span className="ml-2 flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-600">
              <span className="font-medium">AI:</span> {String(question.aiSuggestion)}
            </span>
          )}
        </div>
      )}

      {question.type === 'select' && question.options && (
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => {
            const isAISuggested = question.aiSuggestion === opt.value;
            return (
              <button
                key={String(opt.value)}
                onClick={() => handleSelect(String(opt.value))}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  isAISuggested
                    ? 'border-blue-400 bg-blue-50 font-medium text-blue-700 shadow-sm ring-1 ring-blue-200'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {opt.label}
                {isAISuggested && (
                  <span className="ml-1.5 rounded bg-blue-100 px-1 py-0.5 text-[10px] font-bold text-blue-600">
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'number' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={localValue !== null && localValue !== undefined ? String(localValue) : ''}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNumberSubmit();
            }}
            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Count"
            autoFocus={question.priority === 'blocking'}
          />
          <button
            onClick={handleNumberSubmit}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 hover:shadow"
          >
            Confirm
          </button>
          {question.aiSuggestion !== null && (
            <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-600">
              <span className="font-medium">AI suggests:</span> {String(question.aiSuggestion)}
            </span>
          )}
        </div>
      )}

      {question.type === 'text' && (
        <div className="flex gap-2">
          <input
            type="text"
            value={localValue !== null && localValue !== undefined ? String(localValue) : ''}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && localValue) onAnswer(localValue);
            }}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            onClick={() => { if (localValue) onAnswer(localValue); }}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 hover:shadow"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}

export function SmartQuestionnaire({
  questions,
  onAnswer,
  onComplete,
}: SmartQuestionnaireProps) {
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());

  // Auto-complete when all questions answered (pure effect, not inside setState)
  useEffect(() => {
    if (answeredIds.size >= questions.length && questions.length > 0) {
      onComplete();
    }
  }, [answeredIds.size, questions.length, onComplete]);

  const handleAnswer = useCallback(
    (question: SmartQuestion, value: unknown) => {
      onAnswer(question.fieldPath, value);
      setAnsweredIds((prev) => {
        const next = new Set(prev);
        next.add(question.id);
        return next;
      });
    },
    [onAnswer],
  );

  const remaining = questions.filter((q) => !answeredIds.has(q.id));
  const answered = answeredIds.size;
  const total = questions.length;
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0;

  if (remaining.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header with progress */}
        <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Quick Questions
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                AI analyzed the site — confirm a few details
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-blue-700">
                {answered}/{total}
              </span>
              <span className="text-[10px] text-gray-400">answered</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {remaining.map((question, idx) => (
              <QuestionCard
                key={question.id}
                question={question}
                onAnswer={(value) => handleAnswer(question, value)}
                index={answered + idx}
                total={total}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3">
          <button
            onClick={onComplete}
            className="w-full rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
          >
            Skip remaining ({remaining.length})
          </button>
        </div>
      </div>
    </div>
  );
}

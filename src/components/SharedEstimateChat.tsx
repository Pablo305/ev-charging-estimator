'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { EstimateOutput } from '@/lib/estimate/types';
import { AssistantMessage } from '@/components/SiteChat';

function buildSnapshot(output: EstimateOutput, shareId: string): Record<string, unknown> {
  return {
    shareId,
    projectName: output.input.project.name,
    siteAddress: output.input.site.address,
    clientName: output.input.customer.companyName,
    total: output.summary.total,
    subtotal: output.summary.subtotal,
    tax: output.summary.tax,
    contingency: output.summary.contingency,
    confidence: output.metadata.automationConfidence,
    completeness: output.metadata.inputCompleteness,
    requiresManualReview: output.metadata.requiresManualReview,
    lineItemCount: output.lineItems.length,
    manualReviewCount: output.manualReviewTriggers.length,
    exclusionsPreview: output.exclusions.slice(0, 15).map((e) => `${e.category}: ${e.text}`),
  };
}

interface SharedEstimateChatProps {
  shareId: string;
  output: EstimateOutput;
}

const WELCOME =
  'This is your shared BulletEV estimate. Ask about scope, totals, exclusions, or next steps — I can explain what you\'re seeing (I can\'t change this estimate from here).';

export function SharedEstimateChat({ shareId, output }: SharedEstimateChatProps) {
  const snapshot = useMemo(() => buildSnapshot(output, shareId), [output, shareId]);
  const [messages, setMessages] = useState<readonly { role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const userMsg = { role: 'user' as const, content: text.trim() };
      const updated = [...messagesRef.current, userMsg];
      setMessages(updated);
      setInput('');
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/ai/site-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updated.map((m) => ({ role: m.role, content: m.content })),
            sharedEstimateSnapshot: snapshot,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? `Error ${res.status}`);
          return;
        }
        const reply =
          typeof data.reply === 'string' && data.reply.length > 0
            ? data.reply
            : 'Sorry, I received an empty response.';
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } catch {
        setError('Network error.');
      } finally {
        setLoading(false);
      }
    },
    [loading, snapshot],
  );

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Ask about this estimate</h3>
        <p className="text-[0.6875rem] text-gray-500">Questions about scope, pricing categories, or process</p>
      </div>
      <div
        ref={scrollRef}
        className="max-h-[min(360px,50vh)] min-h-[200px] space-y-3 overflow-y-auto px-4 py-3"
        role="log"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-br-md bg-blue-600 text-white'
                  : 'rounded-bl-md bg-gray-100 text-gray-800'
              }`}
            >
              {msg.role === 'assistant' ? <AssistantMessage content={msg.content} /> : msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-gray-100 px-4 py-3 text-gray-500">Thinking…</div>
          </div>
        )}
      </div>
      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <div className="border-t border-gray-100 px-3 pb-3 pt-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask a question…"
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            disabled={loading}
            aria-label="Chat message"
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

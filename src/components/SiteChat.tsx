'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useEstimate } from '@/contexts/EstimateContext';
import { ChatActionGroup } from '@/components/chat/ChatActionButton';
import { usePathname } from 'next/navigation';

interface SuggestedChange {
  readonly fieldPath: string;
  readonly value: unknown;
  readonly label: string;
}

interface Message {
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly suggestedChanges?: readonly SuggestedChange[];
}

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content:
    'Hey! I\'m the BulletEV assistant. I know everything about this site — charger pricing, installation processes, civil work, electrical requirements, the map workspace, and more. What can I help with?',
};

const SUGGESTED_QUESTIONS = [
  'What charger brands do you support?',
  'How much does a Level 3 installation cost?',
  'What\'s the difference between trenching and boring?',
  'How does the estimate engine work?',
  'Do I need a transformer for L3 chargers?',
];

export function SiteChat() {
  const { input: estimateInput } = useEstimate();
  const pathname = usePathname();
  const isOnEstimatePage = pathname?.startsWith('/estimate') ?? false;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<readonly Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef(messages);
  const isOpenRef = useRef(isOpen);

  // Keep refs current for async callbacks
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    // Use ref to always read latest messages (prevents stale closure)
    const updatedMessages = [...messagesRef.current, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Include estimate context when on estimate pages
      const requestBody: Record<string, unknown> = {
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
      };
      if (isOnEstimatePage) {
        requestBody.currentEstimate = {
          projectType: estimateInput.project.projectType,
          projectName: estimateInput.project.name,
          chargerBrand: estimateInput.charger.brand,
          chargerModel: estimateInput.charger.model,
          chargerCount: estimateInput.charger.count,
          chargingLevel: estimateInput.charger.chargingLevel,
          siteAddress: estimateInput.site.address,
          siteType: estimateInput.site.siteType,
          state: estimateInput.site.state,
        };
      }

      const res = await fetch('/api/ai/site-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }));
        setError(errData.error ?? `Error ${res.status}`);
        return;
      }

      const data = await res.json();
      const reply = typeof data.reply === 'string' && data.reply.length > 0
        ? data.reply
        : 'Sorry, I received an empty response. Please try again.';
      const suggestedChanges = Array.isArray(data.suggestedChanges) ? data.suggestedChanges : undefined;
      const assistantMsg: Message = { role: 'assistant', content: reply, suggestedChanges };
      setMessages((prev) => [...prev, assistantMsg]);

      if (!isOpenRef.current) {
        setHasUnread(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loading, isOnEstimatePage, estimateInput]);

  const handleSend = useCallback(() => {
    sendMessage(input);
  }, [input, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleSuggestion = useCallback((question: string) => {
    sendMessage(question);
  }, [sendMessage]);

  const showSuggestions = messages.length <= 1 && !loading;

  if (pathname?.startsWith('/e/')) {
    return null;
  }

  return (
    <>
      {/* Floating chat window */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="BulletEV chat assistant"
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-20 sm:right-4 sm:w-[380px] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-2xl sm:bottom-24 sm:right-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-[#0B1220] to-[#1a2744] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                B
              </div>
              <div>
                <div className="text-sm font-semibold text-white">BulletEV Assistant</div>
                <div className="text-[10px] text-blue-300">Knows everything about this site</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} role="log" aria-live="polite" aria-label="Chat conversation" className="flex-1 overflow-y-auto px-4 py-3 sm:max-h-[400px] sm:min-h-[250px]">
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[85%] flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'rounded-br-md bg-blue-600 text-white'
                          : 'rounded-bl-md bg-gray-100 text-gray-800'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <AssistantMessage content={msg.content} />
                      ) : (
                        msg.content
                      )}
                    </div>
                    {msg.suggestedChanges && msg.suggestedChanges.length > 0 && (
                      <ChatActionGroup changes={msg.suggestedChanges} />
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Suggested questions */}
            {showSuggestions && (
              <div className="mt-3 space-y-1.5">
                <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Try asking:</div>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestion(q)}
                    className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-[12px] text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Input — extra padding on mobile for virtual keyboard safe area */}
          <div className="border-t border-gray-100 px-3 pb-[env(safe-area-inset-bottom,0.625rem)] pt-2.5 sm:pb-2.5">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about BulletEV..."
                aria-label="Chat message"
                autoFocus
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm transition focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 sm:py-2 sm:text-[13px]"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40 sm:h-9 sm:w-9"
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.5 1.5l13 6.5-13 6.5 2-6.5-2-6.5zm2.3 1.7l1.4 4.8h6.3l-7.7-4.8zm1.4 6.6l-1.4 4.8 7.7-4.8H5.2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 sm:right-6 sm:bottom-6 ${
          isOpen
            ? 'bg-gray-700 hover:bg-gray-800'
            : 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:scale-105'
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l10 10M16 6L6 16" />
          </svg>
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
            </svg>
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500" />
              </span>
            )}
          </>
        )}
      </button>
    </>
  );
}

// ── Markdown-lite renderer for assistant messages ──────────────────

export function AssistantMessage({ content }: { content: string }) {
  // Simple markdown rendering: bold, bullets, numbered lists, code
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-1.5 pl-1">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered lists
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-1.5 pl-1">
              <span className="flex-shrink-0 font-semibold text-blue-600">{numMatch[1]}.</span>
              <span>{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        // Headers
        if (trimmed.startsWith('### ')) {
          return <div key={i} className="font-semibold text-gray-900 mt-1">{trimmed.slice(4)}</div>;
        }
        if (trimmed.startsWith('## ')) {
          return <div key={i} className="font-bold text-gray-900 mt-1">{trimmed.slice(3)}</div>;
        }

        // Table rows (pipe-separated)
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          // Skip separator rows
          if (trimmed.match(/^\|[\s-|]+\|$/)) return null;
          const cells = trimmed.split('|').filter(Boolean).map((c) => c.trim());
          return (
            <div key={i} className="flex gap-2 text-[12px]">
              {cells.map((cell, j) => (
                <span key={j} className={`flex-1 ${j === 0 ? 'font-medium' : 'text-gray-600'}`}>
                  {renderInline(cell)}
                </span>
              ))}
            </div>
          );
        }

        return <div key={i}>{renderInline(trimmed)}</div>;
      })}
    </div>
  );
}

/** Render inline markdown: **bold**, `code`, $price */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>);
      }
      parts.push(<strong key={key++} className="font-semibold">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Inline code
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, codeMatch.index)}</span>);
      }
      parts.push(
        <code key={key++} className="rounded bg-gray-200 px-1 py-0.5 text-[11px] font-mono">
          {codeMatch[1]}
        </code>,
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }

    // No more matches
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

import { NextResponse } from 'next/server';
import { isOpenAIAvailable, chatCompletion } from '@/lib/ai/openai-client';
import { buildChatBuilderSystemPrompt } from '@/lib/ai/prompts';
import { ChatBuilderResponse } from '@/lib/ai/types';

export async function POST(request: Request) {
  if (!isOpenAIAvailable()) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.' },
      { status: 501 },
    );
  }

  try {
    const { messages, currentInput } = await request.json();

    if (!Array.isArray(messages) || !currentInput) {
      return NextResponse.json({ error: 'messages array and currentInput required' }, { status: 400 });
    }

    const systemPrompt = buildChatBuilderSystemPrompt(currentInput);

    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const raw = await chatCompletion(chatMessages, { jsonMode: true, temperature: 0.3 });
    let parsed: ChatBuilderResponse;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid response. Please try again.' }, { status: 502 });
    }

    // Strip any pricing fields
    if (parsed.updatedFields) {
      const blocked = ['estimateControls', 'unitPrice', 'extendedPrice', 'total'];
      for (const key of blocked) {
        delete parsed.updatedFields[key];
      }
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('Chat builder error:', err);
    return NextResponse.json({ error: 'Chat service temporarily unavailable' }, { status: 502 });
  }
}

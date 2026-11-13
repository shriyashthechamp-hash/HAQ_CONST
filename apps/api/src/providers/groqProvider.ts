import Groq from 'groq-sdk';
import { ILLMProvider, ChatMessage, ToolDefinition, LLMResponse } from './interfaces';

export class GroqProvider implements ILLMProvider {
  private client: Groq | null = null;
  private model: string;

  constructor() {
    const key = process.env.GROQ_API_KEY;
    this.model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
    if (key && key.trim() !== '' && !key.startsWith('your_groq_api_key')) {
      this.client = new Groq({ apiKey: key });
    }
  }

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  getModel(): string {
    return this.model;
  }

  async chat(
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    options?: { temperature?: number }
  ): Promise<LLMResponse> {
    if (!this.client) {
      throw new Error('GroqProvider: GROQ_API_KEY is not configured.');
    }

    try {
      const groqMessages = messages.map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'tool' as const,
            content: m.content,
            tool_call_id: m.tool_call_id || '',
          };
        }
        if (m.role === 'assistant' && m.tool_calls) {
          return {
            role: 'assistant' as const,
            content: m.content || null,
            tool_calls: m.tool_calls,
          };
        }
        return {
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        };
      });

      const params: any = {
        model: this.model,
        messages: groqMessages,
        temperature: options?.temperature ?? 0.2,
        max_tokens: 650, // Constrained to prevent OTPM rate limits on developer tiers
      };

      if (tools && tools.length > 0) {
        params.tools = tools;
        params.tool_choice = 'auto';
      }

      const response = await this.client.chat.completions.create(params);
      const choice = response.choices[0];
      const message = choice.message;

      const toolCalls = message.tool_calls?.map((tc) => {
        let args = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          args = { raw: tc.function.arguments };
        }
        return {
          id: tc.id,
          name: tc.function.name,
          arguments: args,
        };
      });

      return {
        content: message.content || '',
        toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
        rawToolCalls: message.tool_calls,
      };
    } catch (err: any) {
      console.error('[GroqProvider] Error:', err?.message || err);
      throw err;
    }
  }
}

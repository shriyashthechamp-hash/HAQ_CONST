export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, any>;
  }>;
  rawToolCalls?: any[];
}

export interface ILLMProvider {
  chat(messages: ChatMessage[], tools?: ToolDefinition[], options?: { temperature?: number }): Promise<LLMResponse>;
}

export interface ISpeechToTextProvider {
  transcribe(audioBase64: string, languageCode?: string): Promise<{ text: string; language: string; confidence?: number }>;
}

export interface ITextToSpeechProvider {
  synthesize(text: string, languageCode?: string, speaker?: string): Promise<{ audioBase64: string; format: string }>;
}

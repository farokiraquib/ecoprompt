/**
 * EcoPrompt CLI — OpenAI Provider Adapter
 * 
 * Handles OpenAI-compatible /v1/chat/completions API format.
 * Works with OpenAI, Azure OpenAI, and any OpenAI-compatible API.
 * Supports message content as string or array of content parts.
 */

import type { Provider, UnifiedMessage, ModelMapping } from './base.js';

/** Model mappings: premium → cost-effective alternative */
const MODEL_MAPPINGS: ModelMapping[] = [
  { premium: 'gpt-4o', downgrade: 'gpt-4o-mini' },
  { premium: 'gpt-4-turbo', downgrade: 'gpt-4o-mini' },
  { premium: 'gpt-4.1', downgrade: 'gpt-4.1-mini' },
  { premium: 'gpt-4.1-2025-04-14', downgrade: 'gpt-4.1-mini' },
  { premium: 'gpt-4o-2024-11-20', downgrade: 'gpt-4o-mini' },
  { premium: 'o3', downgrade: 'o4-mini' },
];

/**
 * Extract text content from OpenAI's flexible content format.
 * Content can be a plain string or an array of content parts.
 */
function extractContentText(content: any): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((part: any) => part.type === 'text' && typeof part.text === 'string')
      .map((part: any) => part.text)
      .join('\n');
  }

  return '';
}

export const openaiProvider: Provider = {
  name: 'OpenAI',

  matchRoute(path: string): boolean {
    return path === '/v1/chat/completions' || path.startsWith('/v1/chat/completions?');
  },

  extractMessages(body: any): UnifiedMessage[] {
    const messages: UnifiedMessage[] = [];

    if (Array.isArray(body.messages)) {
      for (const msg of body.messages) {
        const role: UnifiedMessage['role'] =
          msg.role === 'system' ? 'system' :
          msg.role === 'assistant' ? 'assistant' :
          'user';

        const content = extractContentText(msg.content);
        if (content) {
          messages.push({ role, content });
        }
      }
    }

    return messages;
  },

  extractModel(body: any): string {
    return body.model || 'unknown';
  },

  swapModel(body: any, newModel: string): any {
    return { ...body, model: newModel };
  },

  isStreaming(body: any): boolean {
    return body.stream === true;
  },

  getModelMappings(): ModelMapping[] {
    return MODEL_MAPPINGS;
  },

  findDowngrade(model: string): string | null {
    // Check exact match first
    const exact = MODEL_MAPPINGS.find((m) => m.premium === model);
    if (exact) return exact.downgrade;

    // Check prefix match (e.g., 'gpt-4o-2024-05-13' matches 'gpt-4o')
    const prefix = MODEL_MAPPINGS.find((m) => model.startsWith(m.premium));
    if (prefix) return prefix.downgrade;

    return null;
  },
};

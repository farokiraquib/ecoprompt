/**
 * EcoPrompt CLI — Anthropic Provider Adapter
 * 
 * Handles Anthropic's /v1/messages API format.
 * Supports system prompts as top-level string or content block arrays,
 * and message content as string or array of content blocks.
 */

import type { Provider, UnifiedMessage, ModelMapping } from './base.js';

/** Model mappings: premium → cost-effective alternative */
const MODEL_MAPPINGS: ModelMapping[] = [
  { premium: 'claude-opus-4-20250514', downgrade: 'claude-sonnet-4-20250514' },
  { premium: 'claude-sonnet-4-20250514', downgrade: 'claude-3-5-haiku-20241022' },
  { premium: 'claude-3-5-sonnet-20241022', downgrade: 'claude-3-5-haiku-20241022' },
  { premium: 'claude-3-5-sonnet-20240620', downgrade: 'claude-3-5-haiku-20241022' },
];

/**
 * Extract text content from Anthropic's flexible content format.
 * Content can be a plain string or an array of content blocks.
 */
function extractContentText(content: any): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((block: any) => block.type === 'text' && typeof block.text === 'string')
      .map((block: any) => block.text)
      .join('\n');
  }

  return '';
}

export const anthropicProvider: Provider = {
  name: 'Anthropic',
  defaultBaseUrl: 'https://api.anthropic.com',

  matchRoute(path: string): boolean {
    return path === '/v1/messages' || path.startsWith('/v1/messages?');
  },

  extractMessages(body: any): UnifiedMessage[] {
    const messages: UnifiedMessage[] = [];

    // Handle system prompt — can be a top-level string or array of content blocks
    if (body.system) {
      const systemText = typeof body.system === 'string'
        ? body.system
        : Array.isArray(body.system)
          ? body.system
              .filter((block: any) => block.type === 'text' && typeof block.text === 'string')
              .map((block: any) => block.text)
              .join('\n')
          : '';

      if (systemText) {
        messages.push({ role: 'system', content: systemText });
      }
    }

    // Handle messages array
    if (Array.isArray(body.messages)) {
      for (const msg of body.messages) {
        const role = msg.role === 'assistant' ? 'assistant' : 'user';
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

    // Check prefix match (e.g., 'claude-3-5-sonnet' matches 'claude-3-5-sonnet-20241022')
    const prefix = MODEL_MAPPINGS.find((m) => model.startsWith(m.premium));
    if (prefix) return prefix.downgrade;

    return null;
  },
};

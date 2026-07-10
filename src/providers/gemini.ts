/**
 * EcoPrompt CLI — Gemini Provider Adapter
 * 
 * Handles Google Gemini's REST API format.
 * Gemini uses a different URL structure where the model name is in the path,
 * and the body uses `contents` with `parts` arrays instead of `messages`.
 */

import type { Provider, UnifiedMessage, ModelMapping } from './base.js';

/** Model mappings: premium → cost-effective alternative */
const MODEL_MAPPINGS: ModelMapping[] = [
  { premium: 'gemini-2.5-pro', downgrade: 'gemini-2.5-flash' },
  { premium: 'gemini-2.0-pro', downgrade: 'gemini-2.0-flash' },
  { premium: 'gemini-1.5-pro', downgrade: 'gemini-1.5-flash' },
];

/**
 * Extract model name from Gemini API path.
 * Example: /v1beta/models/gemini-2.5-pro:generateContent → 'gemini-2.5-pro'
 */
function extractModelFromPath(path: string): string {
  const match = path.match(/\/models\/([^:/?]+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Replace the model name in a Gemini API path.
 * Example: /v1beta/models/gemini-2.5-pro:generateContent
 *       → /v1beta/models/gemini-2.5-flash:generateContent
 */
function replaceModelInPath(path: string, newModel: string): string {
  return path.replace(/\/models\/[^:/?]+/, `/models/${newModel}`);
}

/**
 * Extract text from Gemini parts array.
 */
function extractPartsText(parts: any[]): string {
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((part: any) => typeof part.text === 'string')
    .map((part: any) => part.text)
    .join('\n');
}

export const geminiProvider: Provider = {
  name: 'Gemini',
  defaultBaseUrl: 'https://generativelanguage.googleapis.com',

  matchRoute(path: string): boolean {
    return path.includes('/models/') && (
      path.includes('generateContent') ||
      path.includes('streamGenerateContent')
    );
  },

  extractMessages(body: any): UnifiedMessage[] {
    const messages: UnifiedMessage[] = [];

    // Handle systemInstruction
    if (body.systemInstruction) {
      const parts = body.systemInstruction.parts;
      const text = extractPartsText(parts);
      if (text) {
        messages.push({ role: 'system', content: text });
      }
    }

    // Handle contents array
    if (Array.isArray(body.contents)) {
      for (const entry of body.contents) {
        const role: UnifiedMessage['role'] =
          entry.role === 'model' ? 'assistant' : 'user';
        const text = extractPartsText(entry.parts);
        if (text) {
          messages.push({ role, content: text });
        }
      }
    }

    return messages;
  },

  extractModel(body: any, path?: string): string {
    if (path) {
      return extractModelFromPath(path);
    }
    return 'unknown';
  },

  swapModel(body: any, newModel: string): any {
    // Gemini model is in the URL path, not the body.
    // We attach a special field so the proxy layer can rewrite the path.
    return {
      ...body,
      _ecoprompt_new_model: newModel,
    };
  },

  isStreaming(body: any, path?: string): boolean {
    if (path) {
      return path.includes('streamGenerateContent');
    }
    return false;
  },

  getModelMappings(): ModelMapping[] {
    return MODEL_MAPPINGS;
  },

  findDowngrade(model: string): string | null {
    // Check exact match first
    const exact = MODEL_MAPPINGS.find((m) => m.premium === model);
    if (exact) return exact.downgrade;

    // Check prefix match (e.g., 'gemini-2.5-pro-latest' matches 'gemini-2.5-pro')
    const prefix = MODEL_MAPPINGS.find((m) => model.startsWith(m.premium));
    if (prefix) return prefix.downgrade;

    return null;
  },
};

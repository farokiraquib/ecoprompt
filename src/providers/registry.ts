/**
 * EcoPrompt CLI — Provider Registry
 * 
 * Central registry that manages all provider adapters.
 * Used by the proxy layer to detect which provider handles
 * an incoming request and dispatch accordingly.
 */

import type { Provider } from './base.js';
import { anthropicProvider } from './anthropic.js';
import { openaiProvider } from './openai.js';
import { geminiProvider } from './gemini.js';

/** All registered providers, checked in order during route detection */
const providers: Provider[] = [
  anthropicProvider,
  openaiProvider,
  geminiProvider,
];

export const providerRegistry = {
  /**
   * Detect which provider handles the given request path.
   * Returns the first matching provider, or null if no provider matches.
   */
  detectProvider(path: string): Provider | null {
    for (const provider of providers) {
      if (provider.matchRoute(path)) {
        return provider;
      }
    }
    return null;
  },

  /**
   * Get all registered providers.
   */
  getAllProviders(): Provider[] {
    return [...providers];
  },
};

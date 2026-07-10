/**
 * EcoPrompt CLI — Provider Base Types
 * 
 * Defines the unified interfaces that all provider adapters implement.
 * This abstraction allows EcoPrompt to work with any AI provider.
 */

/** Unified message format normalized across all providers */
export interface UnifiedMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Model mapping: premium model to its cheaper alternative */
export interface ModelMapping {
  premium: string;
  downgrade: string;
}

/**
 * Provider interface — each AI API provider implements this.
 * The provider handles format-specific parsing, model detection,
 * and model swapping for its API format.
 */
export interface Provider {
  /** Provider name for logging (e.g., 'Anthropic', 'OpenAI', 'Gemini') */
  readonly name: string;
  
  /** The default API base URL for this provider */
  readonly defaultBaseUrl: string;

  /** Check if this provider handles the given request path */
  matchRoute(path: string): boolean;

  /** Extract messages from provider-specific body format into unified format */
  extractMessages(body: any): UnifiedMessage[];

  /** Extract the model name from the request body (or URL for Gemini) */
  extractModel(body: any, path?: string): string;

  /** Return a new body with the model swapped to the downgrade target */
  swapModel(body: any, newModel: string): any;

  /** Check if the request is streaming */
  isStreaming(body: any, path?: string): boolean;

  /** Get all model mappings for this provider */
  getModelMappings(): ModelMapping[];

  /** Find the downgrade model for a given premium model. Returns null if no mapping exists. */
  findDowngrade(model: string): string | null;
}

/** Result from the provider detection + extraction phase */
export interface ProviderResult {
  provider: Provider;
  messages: UnifiedMessage[];
  model: string;
  isStreaming: boolean;
  downgradeModel: string | null;
}

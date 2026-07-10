export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export interface RequestCost {
  timestamp: number;
  originalModel: string;
  actualModel: string;
  score?: number;
  reason?: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  originalCost: number;
  actualCost: number;
  saved: number;
}

export interface SessionStats {
  totalRequests: number;
  downgradedRequests: number;
  totalOriginalCost: number;
  totalActualCost: number;
  totalSaved: number;
  requestLog: RequestCost[];
}

export class CostTracker {
  private stats: SessionStats;
  private prices: Map<string, ModelPricing>;

  constructor() {
    this.stats = {
      totalRequests: 0,
      downgradedRequests: 0,
      totalOriginalCost: 0,
      totalActualCost: 0,
      totalSaved: 0,
      requestLog: [],
    };

    this.prices = new Map<string, ModelPricing>([
      // Anthropic models
      ['claude-opus-4-20250514',        { inputPerMillion: 15.00, outputPerMillion: 75.00 }],
      ['claude-sonnet-4-20250514',      { inputPerMillion: 3.00,  outputPerMillion: 15.00 }],
      ['claude-3-5-sonnet-20241022',    { inputPerMillion: 3.00,  outputPerMillion: 15.00 }],
      ['claude-3-5-haiku-20241022',     { inputPerMillion: 0.80,  outputPerMillion: 4.00  }],

      // OpenAI models
      ['gpt-4o',                        { inputPerMillion: 2.50,  outputPerMillion: 10.00 }],
      ['gpt-4o-mini',                   { inputPerMillion: 0.15,  outputPerMillion: 0.60  }],
      ['gpt-4-turbo',                   { inputPerMillion: 10.00, outputPerMillion: 30.00 }],
      ['gpt-4.1',                       { inputPerMillion: 2.00,  outputPerMillion: 8.00  }],
      ['gpt-4.1-mini',                  { inputPerMillion: 0.40,  outputPerMillion: 1.60  }],
      ['o3',                            { inputPerMillion: 2.00,  outputPerMillion: 8.00  }],
      ['o4-mini',                       { inputPerMillion: 1.10,  outputPerMillion: 4.40  }],

      // Google Gemini models
      ['gemini-2.5-pro',               { inputPerMillion: 1.25,  outputPerMillion: 10.00 }],
      ['gemini-2.5-flash',             { inputPerMillion: 0.15,  outputPerMillion: 3.50  }],
      ['gemini-2.0-pro',               { inputPerMillion: 1.25,  outputPerMillion: 10.00 }],
      ['gemini-2.0-flash',             { inputPerMillion: 0.075, outputPerMillion: 0.30  }],
      ['gemini-1.5-pro',               { inputPerMillion: 1.25,  outputPerMillion: 5.00  }],
      ['gemini-1.5-flash',             { inputPerMillion: 0.075, outputPerMillion: 0.30  }],
    ]);
  }

  trackRequest(originalModel: string, actualModel: string, inputChars: number, outputChars: number, score?: number, reason?: string): RequestCost {
    const estimatedInputTokens = Math.ceil(inputChars / 4);
    const estimatedOutputTokens = Math.ceil(outputChars / 4);

    const originalPricing = this.prices.get(originalModel) ?? { inputPerMillion: 1.00, outputPerMillion: 5.00 };
    const actualPricing = this.prices.get(actualModel) ?? { inputPerMillion: 1.00, outputPerMillion: 5.00 };

    const originalCost =
      (estimatedInputTokens / 1_000_000) * originalPricing.inputPerMillion +
      (estimatedOutputTokens / 1_000_000) * originalPricing.outputPerMillion;

    const actualCost =
      (estimatedInputTokens / 1_000_000) * actualPricing.inputPerMillion +
      (estimatedOutputTokens / 1_000_000) * actualPricing.outputPerMillion;

    const saved = originalCost - actualCost;

    // Update running totals
    this.stats.totalRequests++;
    if (originalModel !== actualModel) {
      this.stats.downgradedRequests++;
    }
    this.stats.totalOriginalCost += originalCost;
    this.stats.totalActualCost += actualCost;
    this.stats.totalSaved += saved;

    const requestCost: RequestCost = {
      timestamp: Date.now(),
      originalModel,
      actualModel,
      score,
      reason,
      estimatedInputTokens,
      estimatedOutputTokens,
      originalCost,
      actualCost,
      saved,
    };

    this.stats.requestLog.unshift(requestCost);
    if (this.stats.requestLog.length > 100) {
      this.stats.requestLog.pop();
    }

    return requestCost;
  }

  getStats(): SessionStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      totalRequests: 0,
      downgradedRequests: 0,
      totalOriginalCost: 0,
      totalActualCost: 0,
      totalSaved: 0,
      requestLog: [],
    };
  }
}

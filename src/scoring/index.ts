/**
 * Hybrid scoring orchestrator.
 *
 * Combines the fast heuristic, LRU cache, and AI scorer into a
 * single pipeline that decides whether a prompt should be downgraded
 * to a cheaper model.
 */

import type { UnifiedMessage } from '../providers/base.js';
import type { AIScorerConfig, AIScoreResult } from './ai-scorer.js';
import { scoreWithAI } from './ai-scorer.js';
import { runHeuristic } from './heuristic.js';
import { ScoreCache } from './cache.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ScoringConfig {
  mode: 'heuristic' | 'ai' | 'hybrid';
  threshold: number;
  aiConfig?: AIScorerConfig;
  conservative: boolean;
}

export interface ScoringResult {
  score: number;
  shouldDowngrade: boolean;
  reason: string;
  method: 'heuristic' | 'ai' | 'cache';
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// ScoringEngine
// ---------------------------------------------------------------------------

export class ScoringEngine {
  private cache: ScoreCache;
  private config: ScoringConfig;

  constructor(config: ScoringConfig) {
    this.config = config;
    this.cache = new ScoreCache();
  }

  // -----------------------------------------------------------------------
  // Main pipeline
  // -----------------------------------------------------------------------

  /**
   * Score the conversation and decide whether to downgrade the model.
   *
   * Pipeline:
   *   1. Check cache
   *   2. Run heuristic — short-circuit on definitive verdicts
   *   3. (Optional) Call AI scorer for uncertain cases
   *   4. Apply conservative bias
   */
  async score(messages: UnifiedMessage[]): Promise<ScoringResult> {
    const startTime = Date.now();

    // ----- 1. Cache lookup -----
    const cacheKey = this.cache.generateKey(messages);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        score: cached.score,
        shouldDowngrade: cached.score < this.config.threshold,
        reason: `[cached] ${cached.reason}`,
        method: 'cache',
        latencyMs: Date.now() - startTime,
      };
    }

    // ----- 2. Heuristic -----
    const heuristic = runHeuristic(messages);

    if (heuristic.verdict === 'DEFINITELY_SIMPLE') {
      this.cache.set(cacheKey, heuristic.score, heuristic.reason);
      return {
        score: heuristic.score,
        shouldDowngrade: true,
        reason: heuristic.reason,
        method: 'heuristic',
        latencyMs: Date.now() - startTime,
      };
    }

    if (heuristic.verdict === 'DEFINITELY_COMPLEX') {
      this.cache.set(cacheKey, heuristic.score, heuristic.reason);
      return {
        score: heuristic.score,
        shouldDowngrade: false,
        reason: heuristic.reason,
        method: 'heuristic',
        latencyMs: Date.now() - startTime,
      };
    }

    // ----- 3. Heuristic-only mode -----
    if (this.config.mode === 'heuristic') {
      return {
        score: 0.5,
        shouldDowngrade: !this.config.conservative,
        reason: 'Uncertain, heuristic-only mode',
        method: 'heuristic',
        latencyMs: Date.now() - startTime,
      };
    }

    // ----- 4. AI scorer -----
    if (
      (this.config.mode === 'ai' || this.config.mode === 'hybrid') &&
      this.config.aiConfig
    ) {
      try {
        const aiResult: AIScoreResult = await scoreWithAI(
          messages,
          this.config.aiConfig,
        );

        let shouldDowngrade: boolean;

        // Conservative bias: if the score falls in the "grey zone" around
        // the threshold (±0.1), keep the premium model.
        if (
          this.config.conservative &&
          aiResult.score >= this.config.threshold - 0.1 &&
          aiResult.score <= this.config.threshold + 0.1
        ) {
          shouldDowngrade = false;
        } else {
          shouldDowngrade = aiResult.score < this.config.threshold;
        }

        this.cache.set(cacheKey, aiResult.score, aiResult.reason);

        return {
          score: aiResult.score,
          shouldDowngrade,
          reason: aiResult.reason,
          method: 'ai',
          latencyMs: Date.now() - startTime,
        };
      } catch {
        return {
          score: 0.7,
          shouldDowngrade: false,
          reason: 'AI scorer error, keeping premium',
          method: 'heuristic',
          latencyMs: Date.now() - startTime,
        };
      }
    }

    // ----- 5. Fallback -----
    return {
      score: 0.5,
      shouldDowngrade: false,
      reason: 'No AI scorer configured',
      method: 'heuristic',
      latencyMs: Date.now() - startTime,
    };
  }
}

// Re-export public types from sub-modules for convenience
export type { HeuristicVerdict, HeuristicResult } from './heuristic.js';
export type { AIScorerConfig, AIScoreResult } from './ai-scorer.js';
export type { CachedScore } from './cache.js';
export { runHeuristic } from './heuristic.js';
export { scoreWithAI } from './ai-scorer.js';
export { ScoreCache } from './cache.js';

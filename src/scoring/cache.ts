/**
 * LRU score cache.
 *
 * Avoids re-scoring identical (or near-identical) conversations
 * by caching the last N results keyed on a SHA-256 hash of the
 * most recent messages.
 */

import crypto from 'node:crypto';
import type { UnifiedMessage } from '../providers/base.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CachedScore {
  score: number;
  reason: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// ScoreCache
// ---------------------------------------------------------------------------

export class ScoreCache {
  private cache: Map<string, CachedScore>;
  private maxSize: number;
  private ttlMs: number;
  private hits: number = 0;
  private misses: number = 0;

  /**
   * @param maxSize  Maximum number of entries before the oldest is evicted.
   * @param ttlMs    Time-to-live for each entry in milliseconds.
   */
  constructor(maxSize = 1000, ttlMs = 30 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  // -----------------------------------------------------------------------
  // Key generation
  // -----------------------------------------------------------------------

  /**
   * Generate a deterministic cache key from the conversation.
   *
   * Uses the first 200 chars of the last assistant message (if any)
   * concatenated with the first 200 chars of the last user message,
   * then SHA-256 hashed.
   */
  generateKey(messages: UnifiedMessage[]): string {
    let assistantSlice = '';
    let userSlice = '';

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant' && !assistantSlice) {
        assistantSlice = msg.content.slice(0, 200);
      }
      if (msg.role === 'user' && !userSlice) {
        userSlice = msg.content.slice(0, 200);
      }
      if (assistantSlice && userSlice) break;
    }

    const raw = `${assistantSlice}|||${userSlice}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  // -----------------------------------------------------------------------
  // Get / Set
  // -----------------------------------------------------------------------

  /**
   * Retrieve a cached score. Returns `null` if the key is missing or expired.
   */
  get(key: string): CachedScore | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    // TTL check
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry;
  }

  /**
   * Store a score in the cache. Evicts the oldest entry if at capacity.
   */
  set(key: string, score: number, reason: string): void {
    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      // Map iteration order === insertion order in ES2015+
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      score,
      reason,
      timestamp: Date.now(),
    });
  }

  // -----------------------------------------------------------------------
  // Stats
  // -----------------------------------------------------------------------

  /**
   * Return basic cache statistics.
   */
  stats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
    };
  }
}

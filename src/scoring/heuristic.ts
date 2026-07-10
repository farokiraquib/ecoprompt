/**
 * Fast-path heuristic scorer.
 *
 * Catches trivially obvious simple / complex prompts so the
 * slower AI scorer can be skipped entirely.
 */

import type { UnifiedMessage } from '../providers/base.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type HeuristicVerdict = 'DEFINITELY_SIMPLE' | 'DEFINITELY_COMPLEX' | 'UNCERTAIN';

export interface HeuristicResult {
  verdict: HeuristicVerdict;
  score: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Pattern lists
// ---------------------------------------------------------------------------

/** Short commands that are almost always trivial one-liners. */
const SIMPLE_COMMAND_RE = /^(fix|add|remove|delete|rename|format|lint|prettier|indent)\s/i;

/** One-word confirmations / approvals. */
const EXACT_SIMPLE = new Set([
  'yes', 'no', 'ok', 'sure', 'thanks', 'thank you',
  'lgtm', 'looks good', 'y', 'n',
]);

/** Specific micro-fix patterns. */
const SPECIFIC_SIMPLE_PATTERNS: RegExp[] = [
  /^fix\s*(the\s+)?typo/i,
  /^add\s*(a\s+)?semicolon/i,
  /^add\s*(a\s+)?comma/i,
  /^remove\s*(the\s+)?comma/i,
  /^fix\s*(the\s+)?indent/i,
  /^format\s*(the\s+)?(code|file)/i,
];

/** Topics that signal heavy cognitive lifting. */
const COMPLEX_PATTERNS: RegExp[] = [
  /architect/i,
  /design\s+system/i,
  /migrat(e|ion)/i,
  /refactor\s*(the\s+)?entire/i,
  /rewrite\s*(it|the|from)\s*.*from\s+scratch/i,
  /implement\s*.*from\s+scratch/i,
  /security\s+audit/i,
  /performance\s+optimiz/i,
  /race\s+condition/i,
  /deadlock/i,
  /memory\s+leak/i,
  /distributed\s+system/i,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lastMessageByRole(
  messages: UnifiedMessage[],
  role: 'user' | 'assistant',
): UnifiedMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === role) return messages[i];
  }
  return undefined;
}

function countCodeFences(text: string): number {
  const matches = text.match(/```/g);
  return matches ? matches.length : 0;
}

// ---------------------------------------------------------------------------
// Main entry-point
// ---------------------------------------------------------------------------

/**
 * Run a quick heuristic pass over the conversation to see if the
 * complexity is trivially obvious without calling an AI scorer.
 */
export function runHeuristic(messages: UnifiedMessage[]): HeuristicResult {
  const userMsg = lastMessageByRole(messages, 'user');
  if (!userMsg) {
    return { verdict: 'UNCERTAIN', score: 0.5, reason: 'No user message found' };
  }

  const text = userMsg.content.trim();
  const assistantMsg = lastMessageByRole(messages, 'assistant');

  // ------- DEFINITELY_SIMPLE checks -------

  // Very short message + simple command pattern
  if (text.length < 20 && SIMPLE_COMMAND_RE.test(text)) {
    return { verdict: 'DEFINITELY_SIMPLE', score: 0.1, reason: `Short simple command: "${text}"` };
  }

  // Exact match confirmations
  if (EXACT_SIMPLE.has(text.toLowerCase())) {
    // If previous assistant message was long, user might be approving a complex plan
    if (assistantMsg && assistantMsg.content.length >= 200) {
      return {
        verdict: 'UNCERTAIN',
        score: 0.5,
        reason: 'Short confirmation after a long assistant message — may be approving a complex plan',
      };
    }
    return { verdict: 'DEFINITELY_SIMPLE', score: 0.1, reason: `Simple confirmation: "${text}"` };
  }

  // Specific micro-fix patterns
  for (const pattern of SPECIFIC_SIMPLE_PATTERNS) {
    if (pattern.test(text)) {
      return { verdict: 'DEFINITELY_SIMPLE', score: 0.1, reason: `Specific micro-fix pattern: "${text}"` };
    }
  }

  // ------- DEFINITELY_COMPLEX checks -------

  // Known complex topic patterns
  for (const pattern of COMPLEX_PATTERNS) {
    if (pattern.test(text)) {
      return {
        verdict: 'DEFINITELY_COMPLEX',
        score: 0.9,
        reason: `Matches complex pattern: ${pattern}`,
      };
    }
  }

  // Multiple code blocks (>= 3 pairs = 6 fences)
  const fenceCount = countCodeFences(text);
  if (fenceCount >= 6) {
    return {
      verdict: 'DEFINITELY_COMPLEX',
      score: 0.9,
      reason: `Contains ${fenceCount / 2}+ code block pairs`,
    };
  }

  // Very long + technical (> 3000 chars with code blocks)
  if (text.length > 3000 && fenceCount >= 2) {
    return {
      verdict: 'DEFINITELY_COMPLEX',
      score: 0.9,
      reason: 'Very long message with code blocks',
    };
  }

  // ------- Fallback -------

  return { verdict: 'UNCERTAIN', score: 0.5, reason: 'No heuristic matched' };
}

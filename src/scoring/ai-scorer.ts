/**
 * AI-powered semantic scorer.
 *
 * Calls a cheap AI model (Haiku / GPT-4o-mini) to semantically
 * understand prompt complexity when the heuristic is uncertain.
 */

import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import type { UnifiedMessage } from '../providers/base.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AIScorerConfig {
  model: string;
  apiKey: string;
  endpoint: string;
  provider: 'anthropic' | 'openai';
}

export interface AIScoreResult {
  score: number;
  reason: string;
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Scoring meta-prompt
// ---------------------------------------------------------------------------

const SCORING_PROMPT = `You are a coding prompt complexity classifier. Analyze the conversation and score the LATEST user prompt's complexity from 0.0 (trivial) to 1.0 (very complex).

SCORING GUIDE:
- 0.0-0.2: Trivial mechanical changes (fix typo, add import, rename variable, simple formatting)
- 0.2-0.4: Simple well-defined tasks (add a field, write a basic function, simple bug fix)
- 0.4-0.6: Moderate tasks requiring reasoning (refactor a function, add error handling, write tests)
- 0.6-0.8: Complex tasks (debug subtle bugs, design APIs, multi-file refactoring)
- 0.8-1.0: Very complex (architecture decisions, performance optimization, security audits, system design)

CRITICAL RULES:
- If the user is APPROVING or CONFIRMING a previous plan ("yes", "ok", "proceed", "looks good"), score based on the PLAN's complexity, not the short approval message.
- If unsure, score HIGHER. It's better to keep a premium model than risk a bad downgrade.
- Consider the full conversation context, not just the latest message.

Reply with ONLY valid JSON: {"score": 0.X, "reason": "brief explanation"}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Prepare the conversation context for the AI scorer.
 * Takes the last 3 messages, truncates each to 1000 chars.
 */
function formatConversation(messages: UnifiedMessage[]): string {
  const tail = messages.slice(-3);
  return tail
    .map((m) => {
      const content =
        m.content.length > 1000 ? m.content.slice(0, 1000) + '…' : m.content;
      return `[${m.role.toUpperCase()}]: ${content}`;
    })
    .join('\n\n');
}

/**
 * Build the request body depending on provider.
 */
function buildRequestBody(
  provider: 'anthropic' | 'openai',
  model: string,
  conversation: string,
): string {
  if (provider === 'anthropic') {
    return JSON.stringify({
      model,
      max_tokens: 100,
      temperature: 0,
      system: SCORING_PROMPT,
      messages: [{ role: 'user', content: conversation }],
    });
  }

  // OpenAI-compatible
  return JSON.stringify({
    model,
    max_tokens: 100,
    temperature: 0,
    messages: [
      { role: 'system', content: SCORING_PROMPT },
      { role: 'user', content: conversation },
    ],
  });
}

/**
 * Build HTTP request options for the given provider.
 */
function buildRequestOptions(
  parsedUrl: URL,
  provider: 'anthropic' | 'openai',
  apiKey: string,
  bodyLength: number,
): https.RequestOptions {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Content-Length': String(bodyLength),
  };

  if (provider === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: (parsedUrl.pathname && parsedUrl.pathname !== '/')
      ? parsedUrl.pathname + parsedUrl.search
      : (provider === 'anthropic' ? '/v1/messages' : '/v1/chat/completions'),
    method: 'POST',
    headers,
  };
}

/**
 * Extract the text response from the provider-specific body.
 */
function extractResponseText(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  provider: 'anthropic' | 'openai',
): string {
  if (provider === 'anthropic') {
    return body?.content?.[0]?.text ?? '';
  }
  return body?.choices?.[0]?.message?.content ?? '';
}

/**
 * Parse the AI response text into a score + reason.
 */
function parseScoreResponse(
  text: string,
  latencyMs: number,
): AIScoreResult {
  // Try strict JSON parse first
  try {
    const parsed = JSON.parse(text);
    const score = typeof parsed.score === 'number'
      ? Math.max(0, Math.min(1, parsed.score))
      : 0.7;
    const reason = typeof parsed.reason === 'string' ? parsed.reason : 'No reason provided';
    return { score, reason, latencyMs };
  } catch {
    // Fallback: extract a decimal number
    const match = text.match(/([0-9]\.[0-9]+)/);
    if (match) {
      return {
        score: Math.max(0, Math.min(1, parseFloat(match[1]))),
        reason: 'Parsed from non-JSON response',
        latencyMs,
      };
    }
    return { score: 0.7, reason: 'Failed to parse, defaulting high', latencyMs };
  }
}

// ---------------------------------------------------------------------------
// Main entry-point
// ---------------------------------------------------------------------------

/**
 * Score the conversation complexity using a cheap AI model.
 */
export async function scoreWithAI(
  messages: UnifiedMessage[],
  config: AIScorerConfig,
): Promise<AIScoreResult> {
  const start = Date.now();

  try {
    const conversation = formatConversation(messages);
    const bodyStr = buildRequestBody(config.provider, config.model, conversation);
    const parsedUrl = new URL(config.endpoint);
    const options = buildRequestOptions(parsedUrl, config.provider, config.apiKey, Buffer.byteLength(bodyStr));

    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const responseText = await new Promise<string>((resolve, reject) => {
      const req = transport.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');
          try {
            const body = JSON.parse(raw);
            resolve(extractResponseText(body, config.provider));
          } catch {
            reject(new Error(`Invalid JSON response: ${raw.slice(0, 200)}`));
          }
        });
      });

      req.on('error', reject);

      // 5-second timeout
      req.setTimeout(5_000, () => {
        req.destroy(new Error('AI scorer request timed out after 5 s'));
      });

      req.write(bodyStr);
      req.end();
    });

    const latencyMs = Date.now() - start;
    return parseScoreResponse(responseText, latencyMs);
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return { score: 0.7, reason: `AI scorer error: ${message}`, latencyMs };
  }
}

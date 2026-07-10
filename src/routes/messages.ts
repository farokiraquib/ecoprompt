/**
 * EcoPrompt CLI — Message Route Handler
 *
 * Handles all incoming API requests: runs them through the scoring
 * pipeline, decides whether to downgrade the model, and forwards
 * the (possibly modified) request to the upstream provider.
 *
 * Design principle: **fail-open** — if anything goes wrong during
 * scoring or body manipulation, the original request is forwarded
 * unchanged so the user's workflow is never interrupted.
 */

import http from 'node:http';
import type { Provider, UnifiedMessage } from '../providers/base.js';
import type { ScoringEngine, ScoringResult } from '../scoring/index.js';
import type { CostTracker } from '../tracking/cost-tracker.js';
import type { Logger } from '../tracking/logger.js';
import { forwardRequest, type ForwardResult } from '../proxy/forwarder.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RouteHandlerConfig {
  targetUrl: string;
  scoringEngine: ScoringEngine;
  costTracker: CostTracker;
  logger: Logger;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

/** Track total requests so we can log periodic session stats. */
let requestCounter = 0;

export function createMessageHandler(config: RouteHandlerConfig) {
  const { targetUrl, scoringEngine, costTracker, logger } = config;

  /**
   * Process a single message request.
   *
   * @param req   - The original incoming HTTP request.
   * @param res   - The server response to write back to the client.
   * @param body  - The raw request body buffer.
   * @param provider - The detected provider adapter.
   * @param path  - The request URL path.
   */
  return async function handleMessage(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    body: Buffer,
    provider: Provider,
    path: string,
  ): Promise<void> {
    try {
      // -------------------------------------------------------------------
      // 1. Parse body — fail-open on parse error
      // -------------------------------------------------------------------
      let parsedBody: any;
      try {
        parsedBody = JSON.parse(body.toString('utf-8'));
      } catch {
        logger.debug('Body parse error — forwarding unchanged');
        await forwardUnchanged(req, res, body, path);
        return;
      }

      // -------------------------------------------------------------------
      // 2. Extract provider-specific fields
      // -------------------------------------------------------------------
      const messages: UnifiedMessage[] = provider.extractMessages(parsedBody);
      const model: string = provider.extractModel(parsedBody, path);
      const isStreaming: boolean = provider.isStreaming(parsedBody, path);

      // -------------------------------------------------------------------
      // 3. Check for a downgrade mapping
      // -------------------------------------------------------------------
      const downgradeModel: string | null = provider.findDowngrade(model);

      if (!downgradeModel) {
        // No mapping exists — pass through unchanged
        logger.passthrough(path);
        await forwardUnchanged(req, res, body, path);
        return;
      }

      // -------------------------------------------------------------------
      // 4. Score the conversation
      // -------------------------------------------------------------------
      const scoring: ScoringResult = await scoringEngine.score(messages);

      // -------------------------------------------------------------------
      // 5. Decide: downgrade or keep
      // -------------------------------------------------------------------
      let forwardBody: Buffer | string = body;
      let actualModel: string = model;
      let forwardPath: string = path;

      if (scoring.shouldDowngrade && downgradeModel) {
        // Swap the model in the body
        const newBody = provider.swapModel(parsedBody, downgradeModel);
        forwardBody = JSON.stringify(newBody);
        actualModel = downgradeModel;

        // For Gemini the model is embedded in the URL path
        if (newBody._ecoprompt_new_path) {
          forwardPath = newBody._ecoprompt_new_path;
          delete newBody._ecoprompt_new_path;
          forwardBody = JSON.stringify(newBody);
        }

        logger.downgrade(model, downgradeModel, scoring.score, scoring.reason, 0);
      } else {
        logger.keep(model, scoring.score, scoring.reason);
      }

      // -------------------------------------------------------------------
      // 6. Forward the request
      // -------------------------------------------------------------------
      const result: ForwardResult = await forwardRequest(
        {
          targetUrl,
          method: req.method || 'POST',
          path: forwardPath,
          headers: req.headers as Record<string, string | string[] | undefined>,
          body: forwardBody,
          isStreaming,
          newPath: forwardPath !== path ? forwardPath : undefined,
        },
        res,
      );

      // Track cost after forwarding
      const inputChars = body.length;
      const outputChars = result.responseSize;
      costTracker.trackRequest(model, actualModel, inputChars, outputChars, scoring.score, scoring.reason);

      // Periodic session stats
      requestCounter++;
      if (requestCounter % 10 === 0) {
        const stats = costTracker.getStats();
        logger.sessionStats(
          stats.totalRequests,
          stats.downgradedRequests,
          stats.totalSaved,
        );
      }
    } catch (err) {
      // -----------------------------------------------------------------
      // 7. Fail-open: forward the original request on ANY error
      // -----------------------------------------------------------------
      logger.error('Pipeline error', err instanceof Error ? err : new Error(String(err)));
      await forwardUnchanged(req, res, body, path);
    }
  };

  // -----------------------------------------------------------------------
  // Helper: forward the request body unchanged
  // -----------------------------------------------------------------------
  async function forwardUnchanged(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    body: Buffer,
    path: string,
  ): Promise<void> {
    await forwardRequest(
      {
        targetUrl,
        method: req.method || 'POST',
        path,
        headers: req.headers as Record<string, string | string[] | undefined>,
        body,
        isStreaming: false,
      },
      res,
    );
  }
}

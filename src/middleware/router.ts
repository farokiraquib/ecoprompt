/**
 * EcoPrompt CLI — Request Pipeline Orchestrator (Router)
 *
 * Receives every incoming HTTP request and orchestrates the full
 * pipeline:
 *   1. Handle special endpoints (/health, /stats, OPTIONS/CORS)
 *   2. Collect the request body
 *   3. Detect the target AI provider from the URL
 *   4. Delegate to the message handler for scoring + forwarding
 *
 * Any unrecognised path that doesn't match a known provider is
 * forwarded unchanged (transparent passthrough).
 */

import http from 'node:http';
import { providerRegistry } from '../providers/registry.js';
import type { ScoringEngine } from '../scoring/index.js';
import type { CostTracker } from '../tracking/cost-tracker.js';
import type { Logger } from '../tracking/logger.js';
import { createMessageHandler, type RouteHandlerConfig } from '../routes/messages.js';
import { forwardRequest } from '../proxy/forwarder.js';
import { getDashboardHtml } from '../dashboard/template.js';
import { saveUpdatedConfig } from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RouterConfig {
  targetUrl: string;
  scoringEngine: ScoringEngine;
  costTracker: CostTracker;
  logger: Logger;
  codingKey?: string;
}

// ---------------------------------------------------------------------------
// CORS helper
// ---------------------------------------------------------------------------

function setCorsHeaders(res: http.ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
}

// ---------------------------------------------------------------------------
// JSON response helper
// ---------------------------------------------------------------------------

function sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': String(Buffer.byteLength(body)),
  });
  res.end(body);
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createRouter(config: RouterConfig) {
  const { targetUrl, scoringEngine, costTracker, logger } = config;
  let codingKey = config.codingKey;

  const messageHandler = createMessageHandler({
    targetUrl,
    scoringEngine,
    costTracker,
    logger,
  });

  /**
   * Main request handler installed on the HTTP server.
   */
  return async function router(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    try {
      // Always set CORS headers
      setCorsHeaders(res);

      let url = req.url || '/';
      const method = (req.method || 'GET').toUpperCase();

      console.log(`\n[PROXY] Incoming ${method} ${url}`);

      // -----------------------------------------------------------------
      // OPTIONS pre-flight
      // -----------------------------------------------------------------
      if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // -----------------------------------------------------------------
      // Special endpoints
      // -----------------------------------------------------------------
      if (url === '/health' && method === 'GET') {
        sendJson(res, 200, { status: 'ok', uptime: process.uptime() });
        return;
      }

      if (url === '/api/stats' && method === 'GET') {
        sendJson(res, 200, costTracker.getStats());
        return;
      }

      if (url === '/api/settings' && method === 'GET') {
        const config = scoringEngine.getConfig();
        sendJson(res, 200, {
          scorerProvider: config.aiConfig?.provider || 'anthropic',
          scorerModel: config.aiConfig?.model || '',
          scorerEndpoint: config.aiConfig?.endpoint || '',
          scorerKeySet: !!config.aiConfig?.apiKey,
          codingKeySet: !!codingKey,
        });
        return;
      }

      if (url === '/api/settings' && method === 'POST') {
        const body = await collectBody(req);
        const data = JSON.parse(body.toString('utf8'));
        
        // Update in-memory
        scoringEngine.updateConfig({
          aiConfig: {
            provider: data.scorerProvider,
            model: data.scorerModel,
            endpoint: data.scorerEndpoint,
            apiKey: data.scorerKey || scoringEngine.getConfig().aiConfig?.apiKey || '',
          }
        });
        if (data.codingKey !== undefined) {
           codingKey = data.codingKey || '';
        }
        
        // Save to disk
        saveUpdatedConfig({
          scorerProvider: data.scorerProvider,
          scorerModel: data.scorerModel,
          scorerEndpoint: data.scorerEndpoint,
          ...(data.scorerKey ? { scorerKey: data.scorerKey } : {}),
          ...(data.codingKey !== undefined ? { codingKey: data.codingKey } : {})
        });
        
        sendJson(res, 200, { success: true });
        return;
      }

      if ((url === '/' || url === '/stats') && method === 'GET') {
        const html = getDashboardHtml();
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Content-Length': String(Buffer.byteLength(html)),
        });
        res.end(html);
        return;
      }

      // -----------------------------------------------------------------
      // Collect request body
      // -----------------------------------------------------------------
      const body = await collectBody(req);

      // -----------------------------------------------------------------
      // Provider detection
      // -----------------------------------------------------------------
      const provider = providerRegistry.detectProvider(url);

      // -----------------------------------------------------------------
      // Inject Coding API Key if configured
      // -----------------------------------------------------------------
      if (codingKey) {
        if (provider?.name === 'Anthropic') {
          req.headers['x-api-key'] = codingKey;
        } else if (provider?.name === 'Gemini') {
          // Google AI Studio expects the key in the URL query string
          if (url.includes('key=')) {
            url = url.replace(/([?&])key=[^&]+/, `$1key=${codingKey}`);
          } else {
            url += (url.includes('?') ? '&' : '?') + `key=${codingKey}`;
          }
          console.log(`[PROXY] Rewritten Gemini URL: ${url}`);
        } else {
          // Default to Bearer (OpenAI, Groq, custom)
          req.headers['authorization'] = `Bearer ${codingKey}`;
        }
      }

      if (!provider) {
        // Unknown provider — transparent passthrough
        logger.passthrough(url);
        
        let forwardPath = url;
        if (forwardPath.startsWith('/models/') && url.includes(':generateContent')) {
           forwardPath = '/v1beta' + forwardPath;
        }

        await forwardRequest(
          {
            targetUrl,
            method: req.method || 'POST',
            path: forwardPath,
            headers: req.headers as Record<string, string | string[] | undefined>,
            body,
            isStreaming: false,
          },
          res,
        );
        return;
      }

      // -----------------------------------------------------------------
      // Delegate to message handler (scoring pipeline)
      // -----------------------------------------------------------------
      await messageHandler(req, res, body, provider, url);
    } catch (err) {
      // Last-resort error handler
      logger.error('Router error', err instanceof Error ? err : new Error(String(err)));
      if (!res.headersSent) {
        sendJson(res, 500, {
          error: 'Internal Server Error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Body collection helper
// ---------------------------------------------------------------------------

function collectBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', reject);
  });
}

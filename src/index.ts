/**
 * EcoPrompt CLI — Server Entry Point
 *
 * Wires together every subsystem (scoring engine, cost tracker,
 * logger, router) and starts the HTTP reverse-proxy server.
 *
 * Can be used programmatically via `createServer` / `startServer`,
 * or executed directly with `tsx src/index.ts` using env-var config.
 */

import http from 'node:http';
import { createRouter } from './middleware/router.js';
import { ScoringEngine, type ScoringConfig } from './scoring/index.js';
import { CostTracker } from './tracking/cost-tracker.js';
import { Logger } from './tracking/logger.js';
import type { AIScorerConfig } from './scoring/ai-scorer.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ServerConfig {
  port: number;
  target: string;
  threshold: number;
  scorer: 'heuristic' | 'ai' | 'hybrid';
  scorerModel: string;
  scorerKey: string;
  scorerEndpoint: string;
  scorerProvider: 'anthropic' | 'openai';
  codingKey?: string;
  verbose: boolean;
  conservative: boolean;
  noColor: boolean;
  showStats: boolean;
}

// ---------------------------------------------------------------------------
// Version (keep in sync with package.json)
// ---------------------------------------------------------------------------

const VERSION = '0.1.0';

// ---------------------------------------------------------------------------
// Server creation
// ---------------------------------------------------------------------------

/**
 * Build and return an `http.Server` ready to `.listen()`.
 * All subsystems are created and wired together here.
 */
export function createServer(config: ServerConfig): http.Server {
  // 1. Logger
  const logger = new Logger({
    verbose: config.verbose,
    showStats: config.showStats,
    noColor: config.noColor,
  });

  // 2. Cost tracker
  const costTracker = new CostTracker();

  // 3. Scoring engine
  const scoringConfig: ScoringConfig = {
    mode: config.scorer,
    threshold: config.threshold,
    conservative: config.conservative,
  };

  // Optional AI scorer configuration
  if (config.scorer === 'ai' || config.scorer === 'hybrid') {
    const aiConfig: AIScorerConfig = {
      model: config.scorerModel,
      apiKey: config.scorerKey,
      endpoint: config.scorerEndpoint,
      provider: config.scorerProvider,
    };
    scoringConfig.aiConfig = aiConfig;
  }

  const scoringEngine = new ScoringEngine(scoringConfig);

  // 4. Router (request handler)
  const router = createRouter({
    targetUrl: config.target,
    scoringEngine,
    costTracker,
    logger,
    codingKey: config.codingKey,
  });

  // 5. HTTP server
  const server = http.createServer((req, res) => {
    router(req, res).catch((err) => {
      logger.error('Unhandled server error', err instanceof Error ? err : new Error(String(err)));
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
  });

  return server;
}

// ---------------------------------------------------------------------------
// Server start (with lifecycle management)
// ---------------------------------------------------------------------------

/**
 * Create and start the server. Returns a promise that resolves once the
 * server is listening.
 */
export function startServer(config: ServerConfig): Promise<http.Server> {
  const server = createServer(config);

  const logger = new Logger({
    verbose: config.verbose,
    showStats: config.showStats,
    noColor: config.noColor,
  });

  const costTracker = new CostTracker();

  return new Promise<http.Server>((resolve, reject) => {
    server.listen(config.port, () => {
      logger.banner({
        port: config.port,
        target: config.target,
        scorer: config.scorer,
        threshold: config.threshold,
        version: VERSION,
      });
      resolve(server);
    });

    server.on('error', (err) => {
      reject(err);
    });

    // ------------------------------------------------------------------
    // Graceful shutdown
    // ------------------------------------------------------------------
    const shutdown = () => {
      console.log('\n  🌿 Shutting down...');
      const stats = costTracker.getStats();
      logger.sessionStats(
        stats.totalRequests,
        stats.downgradedRequests,
        stats.totalSaved,
      );
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}

// ---------------------------------------------------------------------------
// Direct execution: `tsx src/index.ts` or `node dist/index.js`
// ---------------------------------------------------------------------------

const isDirectRun = process.argv[1]?.includes('index');
if (isDirectRun) {
  const config: ServerConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    target: process.env.TARGET || 'https://api.anthropic.com',
    threshold: parseFloat(process.env.THRESHOLD || '0.4'),
    scorer: (process.env.SCORER as ServerConfig['scorer']) || 'hybrid',
    scorerModel: process.env.SCORER_MODEL || 'claude-3-5-haiku-20241022',
    scorerKey: process.env.ECOPROMPT_SCORER_KEY || process.env.ANTHROPIC_API_KEY || '',
    scorerEndpoint: process.env.SCORER_ENDPOINT || 'https://api.anthropic.com',
    scorerProvider: (process.env.SCORER_PROVIDER as ServerConfig['scorerProvider']) || 'anthropic',
    codingKey: process.env.ECOPROMPT_CODING_KEY || '',
    verbose: process.env.VERBOSE === 'true',
    conservative: process.env.CONSERVATIVE !== 'false',
    noColor: process.env.NO_COLOR === 'true',
    showStats: process.env.SHOW_STATS !== 'false',
  };

  startServer(config);
}

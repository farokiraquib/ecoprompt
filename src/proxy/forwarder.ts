import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

export interface ForwardRequest {
  targetUrl: string;         // Base target URL (e.g., 'https://api.anthropic.com')
  method: string;            // HTTP method
  path: string;              // Request path (e.g., '/v1/messages')
  headers: Record<string, string | string[] | undefined>;
  body: Buffer | string;     // Request body (may be modified)
  isStreaming: boolean;
  newPath?: string;          // Rewritten path (for Gemini model-in-URL swap)
}

export interface ForwardResult {
  statusCode: number;
  responseSize: number;      // bytes of response body
}

export function forwardRequest(
  req: ForwardRequest,
  clientRes: http.ServerResponse
): Promise<ForwardResult> {
  return new Promise<ForwardResult>((resolve) => {
    const parsed = new URL(req.targetUrl);
    const isHttps = parsed.protocol === 'https:';
    const transport = isHttps ? https : http;

    const outgoingPath = req.newPath || req.path;

    // Build outgoing headers: copy all, override host and content-length
    const outgoingHeaders: Record<string, string | string[] | undefined> = {
      ...req.headers,
    };
    delete outgoingHeaders['host'];
    delete outgoingHeaders['content-length'];
    outgoingHeaders['host'] = parsed.hostname;
    outgoingHeaders['content-length'] = String(Buffer.byteLength(req.body));

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: outgoingPath,
      method: req.method,
      headers: outgoingHeaders,
    };

    const proxyReq = transport.request(options, (upstreamRes) => {
      const statusCode = upstreamRes.statusCode ?? 502;

      if (req.isStreaming) {
        // Streaming mode: pipe upstream response directly to client
        clientRes.writeHead(statusCode, upstreamRes.headers);

        let responseSize = 0;
        upstreamRes.on('data', (chunk: Buffer) => {
          responseSize += chunk.length;
        });

        upstreamRes.pipe(clientRes);

        upstreamRes.on('end', () => {
          resolve({ statusCode, responseSize });
        });
      } else {
        // Buffered mode: collect chunks, then write all at once
        const chunks: Buffer[] = [];

        upstreamRes.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        upstreamRes.on('end', () => {
          const body = Buffer.concat(chunks);
          clientRes.writeHead(statusCode, upstreamRes.headers);
          clientRes.end(body);
          resolve({ statusCode, responseSize: body.length });
        });
      }
    });

    // Timeout: 2 minutes (AI responses can be slow)
    proxyReq.setTimeout(120_000, () => {
      proxyReq.destroy();
      if (!clientRes.headersSent) {
        clientRes.writeHead(504, { 'content-type': 'application/json' });
      }
      clientRes.end(JSON.stringify({ error: 'Gateway Timeout', message: 'Upstream request timed out' }));
      resolve({ statusCode: 504, responseSize: 0 });
    });

    proxyReq.on('error', (err: Error) => {
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { 'content-type': 'application/json' });
      }
      clientRes.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
      resolve({ statusCode: 502, responseSize: 0 });
    });

    proxyReq.write(req.body);
    proxyReq.end();
  });
}

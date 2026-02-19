import http from 'node:http';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

export async function startHttpServerIfEnabled(): Promise<void> {
  if (env.HTTP_ENABLED !== 'true') return;

  const port = Number(process.env.PORT || env.HTTP_PORT || 3000);

  const server = http.createServer((req, res) => {
    if (req.url === '/healthz') {
      res.statusCode = 200;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end('ok');
      return;
    }
    res.statusCode = 404;
    res.end('not found');
  });

  server.listen(port, () => {
    logger.info({ port }, 'HTTP server listening');
  });
}

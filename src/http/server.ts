import http from 'node:http';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { handleHealthz } from './routes/healthz.js';

export async function startHttpServerIfEnabled(): Promise<void> {
  if (!env.HTTP_ENABLED) return;

  const port = Number(process.env.PORT || env.HTTP_PORT || 3000);

  const server = http.createServer((req, res) => {
    if (handleHealthz(req, res)) return;
    res.statusCode = 404;
    res.end('not found');
  });

  server.listen(port, () => {
    logger.info({ port }, 'HTTP server listening');
  });
}

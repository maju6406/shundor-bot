import type { IncomingMessage, ServerResponse } from 'node:http';

export function handleHealthz(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.url !== '/healthz') return false;
  res.statusCode = 200;
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  res.end('ok');
  return true;
}

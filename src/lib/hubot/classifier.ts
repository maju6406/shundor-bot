export type HubotCategory = 'message_hear' | 'message_respond' | 'http_webhook' | 'helper' | 'unknown';

export function classifyScript(respondCount: number, hearCount: number, routerCount: number): HubotCategory {
  if (routerCount > 0) return 'http_webhook';
  if (respondCount > 0 && hearCount === 0) return 'message_respond';
  if (hearCount > 0 && respondCount === 0) return 'message_hear';
  if (respondCount > 0 && hearCount > 0) return 'message_hear';
  return 'unknown';
}

export function calculateComplexity(
  respondCount: number,
  hearCount: number,
  routerCount: number,
  envVarCount: number
): number {
  return respondCount * 2 + hearCount * 2 + routerCount * 5 + Math.min(envVarCount, 10);
}

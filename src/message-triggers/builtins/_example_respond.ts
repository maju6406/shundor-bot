import type { Trigger } from '../types.js';
import { safeReply } from '../router.js';

export const exampleRespond: Trigger = {
  id: 'example.respond.echo',
  kind: 'respond',
  description: 'When mentioned, echo back text after "echo".',
  cooldownSeconds: 3,
  match(message) {
    const me = message.client.user;
    if (!me) return null;
    // Remove mention to allow "respond" style parsing: "@Bot echo hi"
    const content = message.content.replace(new RegExp(`<@!?${me.id}>\s*`), '');
    const m = content.match(/^echo\s+(.+)$/i);
    if (!m) return null;
    return { matchText: m[1] };
  },
  async run(ctx, match) {
    await safeReply(ctx.message, String(match.matchText ?? '').trim());
  }
};

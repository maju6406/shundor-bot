import type { Trigger } from '../types.js';
import { safeReply } from '../router.js';

export const exampleHear: Trigger = {
  id: 'example.hear.rimshot',
  kind: 'hear',
  description: 'Replies when someone says "rimshot".',
  cooldownSeconds: 10,
  patterns: [/\brimshot\b/i],
  async run(ctx) {
    await safeReply(ctx.message, '🥁 *ba-dum tss*');
  }
};

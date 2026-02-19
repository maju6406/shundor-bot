import type { Client, Message } from 'discord.js';
import { isOnCooldown, setCooldown } from '../lib/util/cooldown.js';
import { stripMassMentions, truncate } from '../lib/util/text.js';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { kv, db } from '../lib/storage/kv.js';
import type { Trigger, TriggerMatch } from './types.js';

function mentionsBot(message: Message, client: Client): boolean {
  const me = client.user;
  if (!me) return false;
  // True if message mentions bot user
  return message.mentions.users.has(me.id);
}

async function isTriggerEnabled(guildId: string | null, triggerId: string): Promise<boolean> {
  if (!guildId) return true; // DMs: allow by default
  const key = `trigger:${triggerId}:enabled`;
  const val = await kv.get<boolean>(`guild:${guildId}`, key);
  return val ?? true;
}

export async function routeMessageTriggers(client: Client, message: Message, triggers: Trigger[]): Promise<void> {
  if (message.author.bot) return;

  const guildId = message.guild?.id ?? null;
  const botMentioned = mentionsBot(message, client);

  for (const trigger of triggers) {
    // Enable/disable per guild
    if (!(await isTriggerEnabled(guildId, trigger.id))) continue;

    if (trigger.kind === 'respond' && !botMentioned) continue;

    const cooldownKey = `${guildId ?? 'dm'}:${message.author.id}:${trigger.id}`;
    if (isOnCooldown(cooldownKey)) continue;

    let match: TriggerMatch | null = null;

    if (trigger.match) {
      match = trigger.match(message);
    } else if (trigger.patterns?.length) {
      const content = message.content;
      for (const p of trigger.patterns) {
        const m = content.match(p);
        if (m) {
          match = { pattern: p, matchText: m[0] };
          break;
        }
      }
    }

    if (!match) continue;

    setCooldown(cooldownKey, trigger.cooldownSeconds);

    logger.info({ triggerId: trigger.id, kind: trigger.kind, guildId }, 'Message trigger fired');

    // Patch message.reply safety by wrapping content when triggers call message.reply with strings
    // (We keep sanitization responsibility in trigger implementations + helper below.)
    await trigger.run({ client, message, logger, env, kv, db }, match);

    if (!trigger.allowMultiple) return;
  }
}

// Helper for triggers to send safe replies
export async function safeReply(message: Message, content: string): Promise<void> {
  const safe = truncate(stripMassMentions(content));
  await message.reply({ content: safe, allowedMentions: { parse: [] } });
}

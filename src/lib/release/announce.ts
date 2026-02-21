import type { Client, GuildBasedChannel, TextChannel } from 'discord.js';
import { env } from '../env.js';
import { kv } from '../storage/kv.js';
import { logger } from '../logger.js';

export function resolveReleaseVersion(): string | null {
  const version = env.RELEASE_VERSION?.trim() || env.GIT_SHA?.trim();
  return version && version.length > 0 ? version : null;
}

export function parseReleaseNotes(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n|;/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function isTextChannel(channel: GuildBasedChannel | null): channel is TextChannel {
  return !!channel && channel.isTextBased() && 'send' in channel;
}

export function buildReleaseAnnouncementText(version: string): string {
  const notes = parseReleaseNotes(env.RELEASE_NOTES);
  const lines = [`New Version: ${version}`];
  if (notes.length) {
    for (const note of notes) lines.push(`- ${note}`);
  } else {
    lines.push('- Release deployed.');
  }
  return lines.join('\n');
}

export async function announceReleaseIfNeeded(client: Client): Promise<void> {
  if (!env.RELEASE_ANNOUNCE_ENABLED) return;
  const version = resolveReleaseVersion();
  if (!version) return;

  for (const guild of client.guilds.cache.values()) {
    const namespace = `guild:${guild.id}`;
    const key = 'release:last-announced-version';
    const already = await kv.get<string>(namespace, key);
    if (already === version) continue;

    let target: TextChannel | null = null;
    const channels = await guild.channels.fetch();
    for (const channel of channels.values()) {
      if (!isTextChannel(channel)) continue;
      if ('name' in channel && channel.name === env.RELEASE_ANNOUNCE_CHANNEL) {
        target = channel;
        break;
      }
    }

    if (!target) {
      logger.warn(
        { guildId: guild.id, channel: env.RELEASE_ANNOUNCE_CHANNEL },
        'Release announcement skipped: channel not found'
      );
      continue;
    }

    try {
      await target.send(buildReleaseAnnouncementText(version));
      await kv.set(namespace, key, version);
      logger.info({ guildId: guild.id, version }, 'Release announcement sent');
    } catch (error) {
      logger.error({ guildId: guild.id, error }, 'Failed to send release announcement');
    }
  }
}

import { Command } from '@sapphire/framework';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../lib/env.js';
import { buildReleaseAnnouncementText, resolveReleaseVersion } from '../lib/release/announce.js';

function resolvePackageVersion(): string {
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8');
    const parsed = JSON.parse(raw) as { version?: string };
    if (parsed.version?.trim()) return parsed.version;
  } catch {
    // Ignore and fall back to unknown version text.
  }
  return 'unknown';
}

export class VersionCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName('shundorbot-version').setDescription('Show bot version')
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const releaseVersion = resolveReleaseVersion();
    const sha = env.GIT_SHA ? ` (${env.GIT_SHA})` : '';
    const base = releaseVersion ? `${releaseVersion}${sha}` : `v${resolvePackageVersion()}${sha}`;
    if (!releaseVersion) return interaction.reply({ content: base });

    const release = buildReleaseAnnouncementText(releaseVersion);
    return interaction.reply({ content: `${base}\n\n${release}` });
  }
}

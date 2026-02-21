import { Command } from '@sapphire/framework';
import { createRequire } from 'node:module';
import { env } from '../lib/env.js';
import { buildReleaseAnnouncementText, resolveReleaseVersion } from '../lib/release/announce.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

export class VersionCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName('shundorbot-version').setDescription('Show bot version')
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const sha = env.GIT_SHA ? ` (${env.GIT_SHA})` : '';
    const base = `v${pkg.version}${sha}`;
    const releaseVersion = resolveReleaseVersion();
    if (!releaseVersion) return interaction.reply({ content: base });

    const release = buildReleaseAnnouncementText(releaseVersion);
    return interaction.reply({ content: `${base}\n\n${release}` });
  }
}

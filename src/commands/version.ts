import { Command } from '@sapphire/framework';
import { createRequire } from 'node:module';
import { env } from '../lib/env.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

export class VersionCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName('version').setDescription('Show bot version')
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const sha = env.GIT_SHA ? ` (${env.GIT_SHA})` : '';
    return interaction.reply({ content: `v${pkg.version}${sha}` });
  }
}

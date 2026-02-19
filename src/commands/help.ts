import { Command } from '@sapphire/framework';
import { triggers } from '../message-triggers/index.js';
import { env } from '../lib/env.js';

export class HelpCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName('help').setDescription('Show help and available commands')
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const slash = this.container.client.stores.get('commands').map((c) => `/${c.name}`).sort();
    const respond = triggers.filter(t => t.kind === 'respond').map(t => `• ${t.id} — ${t.description}`);
    const hear = triggers.filter(t => t.kind === 'hear').map(t => `• ${t.id} — ${t.description}`);

    const lines = [
      `**${env.BOT_NAME} Help**`,
      '',
      '**Slash commands:**',
      ...(slash.length ? slash : ['(none)']),
      '',
      '**Respond triggers (mention-only):**',
      ...(respond.length ? respond : ['(none)']),
      '',
      '**Hear triggers (ambient):**',
      ...(hear.length ? hear : ['(none)']),
      '',
      '_Tip: mention the bot for respond-style triggers, e.g. `@Bot echo hello`._'
    ];

    return interaction.reply({ content: lines.join('\n') });
  }
}

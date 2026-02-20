import { Command } from '@sapphire/framework';
import { triggers } from '../message-triggers/index.js';
import { env } from '../lib/env.js';

function triggerPhraseFromId(triggerId: string): string {
  // hubot.hear.mic-drop -> mic drop
  const tail = triggerId.split('.').pop() ?? triggerId;
  return tail.replace(/-/g, ' ');
}

export class HelpCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName('shundorbot-help').setDescription('Show help and available commands')
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const slash = this.container.client.stores.get('commands').map((c) => `/${c.name}`).sort();
    const respond = triggers.filter(t => t.kind === 'respond').map(t => `• ${t.id} — ${t.description}`);
    const hubotScriptHelp = triggers
      .filter((t) => t.id.startsWith('hubot.'))
      .map((t) => `${triggerPhraseFromId(t.id)} - ${t.description}`)
      .sort((a, b) => a.localeCompare(b));

    const lines = [
      `**${env.BOT_NAME} Help**`,
      '',
      '**Hubot-style scripts:**',
      ...(hubotScriptHelp.length ? hubotScriptHelp : ['(none)']),
      '',
      '**Slash commands:**',
      ...(slash.length ? slash : ['(none)']),
      '',
      '**Respond triggers (mention-only):**',
      ...(respond.length ? respond : ['(none)']),
      '',
      '_Tip: mention the bot for respond-style triggers, e.g. `@Bot echo hello`._'
    ];

    return interaction.reply({ content: lines.join('\n') });
  }
}

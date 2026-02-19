import { Command } from '@sapphire/framework';
import { triggers } from '../../message-triggers/index.js';
import { kv } from '../../lib/storage/kv.js';

export class TriggersAdminCommand extends Command {
  public constructor(ctx: Command.Context, opts: Command.Options) {
    super(ctx, {
      ...opts,
      preconditions: ['IsAdmin']
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('triggers')
        .setDescription('Manage message triggers')
        .addSubcommand((sc) =>
          sc.setName('list').setDescription('List triggers and enabled status')
        )
        .addSubcommand((sc) =>
          sc
            .setName('enable')
            .setDescription('Enable a trigger')
            .addStringOption((o) =>
              o.setName('id').setDescription('Trigger id').setRequired(true)
            )
        )
        .addSubcommand((sc) =>
          sc
            .setName('disable')
            .setDescription('Disable a trigger')
            .addStringOption((o) =>
              o.setName('id').setDescription('Trigger id').setRequired(true)
            )
        )
    );
  }

  private async getEnabled(guildId: string, triggerId: string): Promise<boolean> {
    const val = await kv.get<boolean>(`guild:${guildId}`, `trigger:${triggerId}:enabled`);
    return val ?? true;
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: 'This command must be used in a server.', ephemeral: true });
    }
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand(true);

    if (sub === 'list') {
      const lines: string[] = [];
      for (const t of triggers) {
        const enabled = await this.getEnabled(guildId, t.id);
        lines.push(`${enabled ? '✅' : '⛔'} \`${t.id}\` — ${t.description}`);
      }
      return interaction.reply({ content: lines.join('\n') || '(no triggers found)', ephemeral: true });
    }

    const id = interaction.options.getString('id', true);
    const exists = triggers.some(t => t.id === id);
    if (!exists) return interaction.reply({ content: `Unknown trigger id: ${id}`, ephemeral: true });

    const ns = `guild:${guildId}`;
    const key = `trigger:${id}:enabled`;

    if (sub === 'enable') {
      await kv.set(ns, key, true);
      return interaction.reply({ content: `Enabled trigger: ${id}`, ephemeral: true });
    }

    if (sub === 'disable') {
      await kv.set(ns, key, false);
      return interaction.reply({ content: `Disabled trigger: ${id}`, ephemeral: true });
    }

    return interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
  }
}

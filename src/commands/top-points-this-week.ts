import { Command } from '@sapphire/framework';
import { renderPointsLeaderboard } from '../lib/points/format.js';

export class TopPointsWeekCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName('top-points-this-week').setDescription('Show points leaderboard for this week')
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inGuild() || !interaction.guildId) {
      return interaction.reply({ ephemeral: true, content: 'This command can only be used in a server.' });
    }
    return interaction.reply({ content: await renderPointsLeaderboard(interaction.guildId, 'week') });
  }
}

import { Command } from '@sapphire/framework';
import {
  POINTS_COOLDOWN_SECONDS,
  POINTS_MAX_GRANT,
  awardPoints,
  getCooldownRemainingSeconds,
  pickAwardGif,
  setCooldown
} from '../lib/points/service.js';

export class PointsCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName('points')
        .setDescription('Give points to a user')
        .addUserOption((option) => option.setName('user').setDescription('User to award').setRequired(true))
        .addIntegerOption((option) =>
          option
            .setName('number')
            .setDescription(`Points to award (default 1, max ${POINTS_MAX_GRANT})`)
            .setMinValue(1)
            .setMaxValue(POINTS_MAX_GRANT)
            .setRequired(false)
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inGuild() || !interaction.guildId) {
      return interaction.reply({ ephemeral: true, content: 'This command can only be used in a server.' });
    }

    const receiver = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('number') ?? 1;
    const giverId = interaction.user.id;

    if (receiver.id === giverId) {
      return interaction.reply({ ephemeral: true, content: 'You cannot give points to yourself.' });
    }

    if (receiver.bot) {
      return interaction.reply({ ephemeral: true, content: 'You cannot award points to bots.' });
    }

    const remaining = await getCooldownRemainingSeconds(interaction.guildId, giverId);
    if (remaining > 0) {
      return interaction.reply({
        ephemeral: true,
        content: `You are on cooldown. Try again in ${remaining}s.`
      });
    }

    const total = await awardPoints(interaction.guildId, giverId, receiver.id, amount);
    await setCooldown(interaction.guildId, giverId, POINTS_COOLDOWN_SECONDS);
    const gif = pickAwardGif();

    const lines = [`Awww yiss, <@${receiver.id}> now has ${total} points!`];
    if (gif) lines.push(gif);

    return interaction.reply({ content: lines.join('\n') });
  }
}

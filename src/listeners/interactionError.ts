import { Listener } from '@sapphire/framework';
import { logger } from '../lib/logger.js';
import type { ChatInputCommandInteraction } from 'discord.js';

export class InteractionErrorListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'interactionError'
    });
  }

  public override async run(error: unknown, interaction: ChatInputCommandInteraction) {
    logger.error({ error }, 'Interaction error');
    try {
      if (interaction.isRepliable()) {
        const content = 'Something went wrong while handling that. Check logs for details.';
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content, ephemeral: true });
        } else {
          await interaction.reply({ content, ephemeral: true });
        }
      }
    } catch (e) {
      logger.error({ e }, 'Failed to notify user about interaction error');
    }
  }
}

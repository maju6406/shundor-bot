import { Listener } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { triggers } from '../message-triggers/index.js';
import { routeMessageTriggers } from '../message-triggers/router.js';

export class MessageCreateListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, { ...options, event: 'messageCreate' });
  }

  public override async run(message: Message) {
    await routeMessageTriggers(this.container.client, message, triggers);
  }
}

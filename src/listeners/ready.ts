import { Listener } from '@sapphire/framework';
import { logger } from '../lib/logger.js';

export class ReadyListener extends Listener {
  public override run() {
    logger.info({ user: this.container.client.user?.tag }, 'Ready');
  }
}

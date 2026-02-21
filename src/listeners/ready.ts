import { Listener } from '@sapphire/framework';
import { logger } from '../lib/logger.js';
import { announceReleaseIfNeeded } from '../lib/release/announce.js';

export class ReadyListener extends Listener {
  public override async run() {
    logger.info({ user: this.container.client.user?.tag }, 'Ready');
    await announceReleaseIfNeeded(this.container.client);
  }
}

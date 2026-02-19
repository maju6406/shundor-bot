import { SapphireClient, LogLevel } from '@sapphire/framework';
import { GatewayIntentBits, Partials } from 'discord.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { startHttpServerIfEnabled } from './http/server.js';

const client = new SapphireClient({
  defaultPrefix: env.BOT_PREFIX || undefined,
  logger: {
    level: LogLevel.Info
  },
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

async function main() {
  await startHttpServerIfEnabled();
  await client.login(env.DISCORD_TOKEN);
  logger.info({ bot: env.BOT_NAME }, 'Bot starting…');
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});

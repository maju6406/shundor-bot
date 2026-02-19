import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ['DISCORD_TOKEN', 'DATABASE_URL'],
    remove: true
  }
});

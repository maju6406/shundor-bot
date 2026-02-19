import 'dotenv/config';
import { z } from 'zod';

const schema = z
  .object({
    DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
    DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
    DISCORD_GUILD_ID: z.string().optional(),
    BOT_NAME: z.string().default('HubotMigrator'),
    LOG_LEVEL: z.string().default('info'),
    BOT_PREFIX: z.string().optional(),
    ADMIN_ROLE_IDS: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    DATABASE_PATH: z.string().default('./data/bot.sqlite'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HUBOT_SCRIPTS_DIR: z.string().default('./vendor/hubot-scripts/src/scripts'),
    HTTP_ENABLED: z
      .union([z.boolean(), z.string()])
      .transform((v) => (typeof v === 'boolean' ? v : v.toLowerCase() === 'true'))
      .default(false),
    HTTP_PORT: z
      .union([z.number(), z.string()])
      .transform((v) => Number(v))
      .pipe(z.number().int().min(1).max(65535))
      .default(3000),
    GIT_SHA: z.string().optional()
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV === 'production' && !val.DATABASE_URL?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL is required when NODE_ENV=production'
      });
    }
  });

export const env = schema.parse(process.env);
export type Env = typeof env;

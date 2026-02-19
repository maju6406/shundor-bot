import type { Client, Message } from 'discord.js';
import type { Logger } from 'pino';
import type { Env } from '../lib/env.js';
import type { IDb } from '../lib/storage/db.js';
import { kv } from '../lib/storage/kv.js';

export type TriggerKind = 'hear' | 'respond';

export interface TriggerContext {
  client: Client;
  message: Message;
  logger: Logger;
  env: Env;
  kv: typeof kv;
  db: IDb;
}

export interface TriggerMatch {
  pattern?: RegExp;
  groups?: Record<string, string>;
  matchText?: string;
}

export interface Trigger {
  id: string;
  kind: TriggerKind;
  description: string;
  cooldownSeconds: number;
  allowMultiple?: boolean;
  patterns?: RegExp[];
  match?: (message: Message) => TriggerMatch | null;
  run: (ctx: TriggerContext, match: TriggerMatch) => Promise<void>;
}

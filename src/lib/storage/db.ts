import fs from 'node:fs';
import path from 'node:path';
import { env } from '../env.js';
import { logger } from '../logger.js';
import Database from 'better-sqlite3';
import pg from 'pg';

export type DbMode = 'postgres' | 'sqlite';

export interface IDb {
  mode: DbMode;
  // KV operations
  kvGet(namespace: string, key: string): Promise<string | null>;
  kvSet(namespace: string, key: string, value: string): Promise<void>;
  kvDelete(namespace: string, key: string): Promise<void>;
}

class MemoryDb implements IDb {
  public mode: DbMode = 'sqlite';
  private readonly kvStore = new Map<string, string>();

  private key(namespace: string, key: string): string {
    return `${namespace}::${key}`;
  }

  async kvGet(namespace: string, key: string): Promise<string | null> {
    return this.kvStore.get(this.key(namespace, key)) ?? null;
  }

  async kvSet(namespace: string, key: string, value: string): Promise<void> {
    this.kvStore.set(this.key(namespace, key), value);
  }

  async kvDelete(namespace: string, key: string): Promise<void> {
    this.kvStore.delete(this.key(namespace, key));
  }
}

class SqliteDb implements IDb {
  public mode: DbMode = 'sqlite';
  private db: Database.Database;

  constructor() {
    const dbDir = path.dirname(env.DATABASE_PATH);
    fs.mkdirSync(dbDir, { recursive: true });
    this.db = new Database(env.DATABASE_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv (
        namespace TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY(namespace, key)
      );
    `);
  }

  async kvGet(namespace: string, key: string): Promise<string | null> {
    const row = this.db.prepare('SELECT value FROM kv WHERE namespace = ? AND key = ?').get(namespace, key) as any;
    return row?.value ?? null;
  }

  async kvSet(namespace: string, key: string, value: string): Promise<void> {
    this.db.prepare(`
      INSERT INTO kv(namespace, key, value, updated_at)
      VALUES(?, ?, ?, ?)
      ON CONFLICT(namespace, key)
      DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
    `).run(namespace, key, value, Date.now());
  }

  async kvDelete(namespace: string, key: string): Promise<void> {
    this.db.prepare('DELETE FROM kv WHERE namespace = ? AND key = ?').run(namespace, key);
  }
}

class PostgresDb implements IDb {
  public mode: DbMode = 'postgres';
  private pool: pg.Pool;
  private readonly ready: Promise<void>;

  constructor() {
    if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required for postgres mode');
    this.pool = new pg.Pool({ connectionString: env.DATABASE_URL });
    this.ready = this.ensure();
  }

  private async ensure(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS kv (
        namespace TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY(namespace, key)
      );
    `);
  }

  async kvGet(namespace: string, key: string): Promise<string | null> {
    await this.ready;
    const res = await this.pool.query('SELECT value FROM kv WHERE namespace=$1 AND key=$2', [namespace, key]);
    return res.rows[0]?.value ?? null;
  }

  async kvSet(namespace: string, key: string, value: string): Promise<void> {
    await this.ready;
    await this.pool.query(`
      INSERT INTO kv(namespace, key, value, updated_at)
      VALUES($1,$2,$3,$4)
      ON CONFLICT(namespace, key)
      DO UPDATE SET value=EXCLUDED.value, updated_at=EXCLUDED.updated_at
    `, [namespace, key, value, Date.now()]);
  }

  async kvDelete(namespace: string, key: string): Promise<void> {
    await this.ready;
    await this.pool.query('DELETE FROM kv WHERE namespace=$1 AND key=$2', [namespace, key]);
  }
}

export function createDb(): IDb {
  if (env.DATABASE_URL && env.DATABASE_URL.trim().length > 0) {
    logger.info('Using Postgres database (DATABASE_URL set).');
    return new PostgresDb();
  }

  try {
    logger.info('Using SQLite database (DATABASE_URL not set).');
    return new SqliteDb();
  } catch (error) {
    logger.warn(
      { error },
      'SQLite initialization failed in local mode; falling back to in-memory KV store for this process.'
    );
    return new MemoryDb();
  }
}

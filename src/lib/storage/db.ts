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
  // Points operations
  pointsGive(guildId: string, giverId: string, receiverId: string, points: number, createdAt: number): Promise<void>;
  pointsGetTotal(guildId: string, userId: string): Promise<number>;
  pointsTop(guildId: string, sinceMs: number | null, limit: number): Promise<Array<{ userId: string; points: number }>>;
}

class MemoryDb implements IDb {
  public mode: DbMode = 'sqlite';
  private readonly kvStore = new Map<string, string>();
  private readonly pointEvents: Array<{
    guildId: string;
    giverId: string;
    receiverId: string;
    points: number;
    createdAt: number;
  }> = [];

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

  async pointsGive(guildId: string, giverId: string, receiverId: string, points: number, createdAt: number): Promise<void> {
    this.pointEvents.push({ guildId, giverId, receiverId, points, createdAt });
  }

  async pointsGetTotal(guildId: string, userId: string): Promise<number> {
    return this.pointEvents
      .filter((e) => e.guildId === guildId && e.receiverId === userId)
      .reduce((sum, e) => sum + e.points, 0);
  }

  async pointsTop(guildId: string, sinceMs: number | null, limit: number): Promise<Array<{ userId: string; points: number }>> {
    const totals = new Map<string, number>();
    for (const event of this.pointEvents) {
      if (event.guildId !== guildId) continue;
      if (sinceMs != null && event.createdAt < sinceMs) continue;
      totals.set(event.receiverId, (totals.get(event.receiverId) ?? 0) + event.points);
    }

    return [...totals.entries()]
      .map(([userId, points]) => ({ userId, points }))
      .sort((a, b) => b.points - a.points || a.userId.localeCompare(b.userId))
      .slice(0, limit);
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

      CREATE TABLE IF NOT EXISTS points_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        giver_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        points INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_points_ledger_guild_receiver_created
        ON points_ledger(guild_id, receiver_id, created_at);
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

  async pointsGive(guildId: string, giverId: string, receiverId: string, points: number, createdAt: number): Promise<void> {
    this.db.prepare(`
      INSERT INTO points_ledger(guild_id, giver_id, receiver_id, points, created_at)
      VALUES(?, ?, ?, ?, ?)
    `).run(guildId, giverId, receiverId, points, createdAt);
  }

  async pointsGetTotal(guildId: string, userId: string): Promise<number> {
    const row = this.db
      .prepare('SELECT COALESCE(SUM(points), 0) AS total FROM points_ledger WHERE guild_id = ? AND receiver_id = ?')
      .get(guildId, userId) as { total?: number } | undefined;
    return Number(row?.total ?? 0);
  }

  async pointsTop(guildId: string, sinceMs: number | null, limit: number): Promise<Array<{ userId: string; points: number }>> {
    const rows = (sinceMs == null
      ? this.db.prepare(`
          SELECT receiver_id AS userId, SUM(points) AS points
          FROM points_ledger
          WHERE guild_id = ?
          GROUP BY receiver_id
          ORDER BY points DESC, receiver_id ASC
          LIMIT ?
        `).all(guildId, limit)
      : this.db.prepare(`
          SELECT receiver_id AS userId, SUM(points) AS points
          FROM points_ledger
          WHERE guild_id = ? AND created_at >= ?
          GROUP BY receiver_id
          ORDER BY points DESC, receiver_id ASC
          LIMIT ?
        `).all(guildId, sinceMs, limit)) as Array<{ userId: string; points: number }>;

    return rows.map((row) => ({ userId: String(row.userId), points: Number(row.points) }));
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

      CREATE TABLE IF NOT EXISTS points_ledger (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        giver_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        points INTEGER NOT NULL,
        created_at BIGINT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_points_ledger_guild_receiver_created
        ON points_ledger(guild_id, receiver_id, created_at);
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

  async pointsGive(guildId: string, giverId: string, receiverId: string, points: number, createdAt: number): Promise<void> {
    await this.ready;
    await this.pool.query(
      `INSERT INTO points_ledger(guild_id, giver_id, receiver_id, points, created_at)
       VALUES($1, $2, $3, $4, $5)`,
      [guildId, giverId, receiverId, points, createdAt]
    );
  }

  async pointsGetTotal(guildId: string, userId: string): Promise<number> {
    await this.ready;
    const res = await this.pool.query(
      'SELECT COALESCE(SUM(points), 0) AS total FROM points_ledger WHERE guild_id=$1 AND receiver_id=$2',
      [guildId, userId]
    );
    return Number(res.rows[0]?.total ?? 0);
  }

  async pointsTop(guildId: string, sinceMs: number | null, limit: number): Promise<Array<{ userId: string; points: number }>> {
    await this.ready;
    const res = sinceMs == null
      ? await this.pool.query(
          `SELECT receiver_id AS "userId", SUM(points)::BIGINT AS points
           FROM points_ledger
           WHERE guild_id=$1
           GROUP BY receiver_id
           ORDER BY points DESC, receiver_id ASC
           LIMIT $2`,
          [guildId, limit]
        )
      : await this.pool.query(
          `SELECT receiver_id AS "userId", SUM(points)::BIGINT AS points
           FROM points_ledger
           WHERE guild_id=$1 AND created_at >= $2
           GROUP BY receiver_id
           ORDER BY points DESC, receiver_id ASC
           LIMIT $3`,
          [guildId, sinceMs, limit]
        );

    return res.rows.map((row) => ({ userId: String(row.userId), points: Number(row.points) }));
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

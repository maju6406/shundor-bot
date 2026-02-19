import { createDb, type IDb } from './db.js';

const db: IDb = createDb();

export const kv = {
  async get<T = unknown>(namespace: string, key: string): Promise<T | null> {
    const raw = await db.kvGet(namespace, key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  },
  async set(namespace: string, key: string, value: unknown): Promise<void> {
    await db.kvSet(namespace, key, JSON.stringify(value));
  },
  async delete(namespace: string, key: string): Promise<void> {
    await db.kvDelete(namespace, key);
  }
};

export { db };

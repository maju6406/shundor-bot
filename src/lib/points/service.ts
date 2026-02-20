import { db, kv } from '../storage/kv.js';
import { pointsAwardGifs } from './gifs.js';

export const POINTS_COOLDOWN_SECONDS = 30;
export const POINTS_MAX_GRANT = 100;
export const LEADERBOARD_LIMIT = 10;
const PACIFIC_TZ = 'America/Los_Angeles';

type WindowName = 'all' | 'week' | 'month' | 'year';

function getPacificParts(input: Date): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  }).formatToParts(input);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: weekdayMap[map.weekday] ?? 0
  };
}

function pacificOffsetMinutes(atMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TZ,
    timeZoneName: 'shortOffset'
  }).formatToParts(new Date(atMs));
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-8';
  const match = tz.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return -8 * 60;
  const sign = match[1] === '-' ? -1 : 1;
  const hh = Number(match[2]);
  const mm = Number(match[3] ?? '0');
  return sign * (hh * 60 + mm);
}

function pacificLocalMidnightToUtcMs(year: number, month: number, day: number): number {
  const localMidnightAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  let guess = localMidnightAsUtc;
  for (let i = 0; i < 3; i += 1) {
    const offsetMs = pacificOffsetMinutes(guess) * 60_000;
    guess = localMidnightAsUtc - offsetMs;
  }
  return guess;
}

export function getWindowStartMs(window: WindowName): number | null {
  const now = new Date();
  if (window === 'all') return null;
  const p = getPacificParts(now);

  if (window === 'week') {
    const offset = p.weekday === 0 ? -6 : 1 - p.weekday; // Monday start
    const mondayUtc = Date.UTC(p.year, p.month - 1, p.day + offset, 0, 0, 0, 0);
    const monday = new Date(mondayUtc);
    return pacificLocalMidnightToUtcMs(
      monday.getUTCFullYear(),
      monday.getUTCMonth() + 1,
      monday.getUTCDate()
    );
  }

  if (window === 'month') return pacificLocalMidnightToUtcMs(p.year, p.month, 1);
  return pacificLocalMidnightToUtcMs(p.year, 1, 1);
}

export function pickAwardGif(): string {
  if (!pointsAwardGifs.length) return '';
  return pointsAwardGifs[Math.floor(Math.random() * pointsAwardGifs.length)];
}

export async function getCooldownRemainingSeconds(guildId: string, giverId: string): Promise<number> {
  const key = `points:cooldown:${giverId}`;
  const until = await kv.get<number>(`guild:${guildId}`, key);
  if (!until) return 0;
  const msRemaining = until - Date.now();
  return msRemaining > 0 ? Math.ceil(msRemaining / 1000) : 0;
}

export async function setCooldown(guildId: string, giverId: string, seconds: number): Promise<void> {
  const key = `points:cooldown:${giverId}`;
  await kv.set(`guild:${guildId}`, key, Date.now() + seconds * 1000);
}

export async function awardPoints(
  guildId: string,
  giverId: string,
  receiverId: string,
  amount: number
): Promise<number> {
  await db.pointsGive(guildId, giverId, receiverId, amount, Date.now());
  return db.pointsGetTotal(guildId, receiverId);
}

export async function awardPointsBulk(
  guildId: string,
  giverId: string,
  receiverIds: readonly string[],
  amount: number
): Promise<number> {
  if (!receiverIds.length) return 0;
  const now = Date.now();
  for (const receiverId of receiverIds) {
    await db.pointsGive(guildId, giverId, receiverId, amount, now);
  }
  return receiverIds.length;
}

export async function getTopPoints(guildId: string, window: WindowName, limit = LEADERBOARD_LIMIT) {
  return db.pointsTop(guildId, getWindowStartMs(window), limit);
}

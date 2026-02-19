type Key = string;

const cooldowns = new Map<Key, number>();

export function isOnCooldown(key: Key): boolean {
  const until = cooldowns.get(key);
  if (!until) return false;
  if (Date.now() > until) {
    cooldowns.delete(key);
    return false;
  }
  return true;
}

export function setCooldown(key: Key, seconds: number): void {
  cooldowns.set(key, Date.now() + seconds * 1000);
}

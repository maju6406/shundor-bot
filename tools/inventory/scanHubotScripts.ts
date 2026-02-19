import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../../src/lib/env.js';
import { logger } from '../../src/lib/logger.js';

type ScriptEntry = {
  id: string;
  filePath: string;
  language: 'coffee' | 'js';
  header: Record<string, unknown>;
  detected: {
    respondCount: number;
    hearCount: number;
    routerCount: number;
    envVars: string[];
    patterns: string[];
  };
  categoryGuess: 'message_hear' | 'message_respond' | 'http_webhook' | 'helper' | 'unknown';
  complexityScore: number;
  migrationStatus: 'todo';
  replacement: null;
};

function walk(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.isFile() && (full.endsWith('.coffee') || full.endsWith('.js'))) out.push(full);
  }
  return out;
}

function hashId(relPath: string): string {
  return crypto.createHash('sha1').update(relPath).digest('hex').slice(0, 12);
}

function parseHeader(text: string): Record<string, unknown> {
  // Best-effort: parse block that starts with # Description:, etc.
  const header: Record<string, unknown> = {};
  const lines = text.split(/\r?\n/);
  const keys = ['Description', 'Dependencies', 'Configuration', 'Commands', 'Notes', 'Author'];
  let current: string | null = null;
  const buf: Record<string, string[]> = {};
  for (const k of keys) buf[k] = [];

  for (const line of lines.slice(0, 120)) {
    const m = line.match(/^\s*#\s*(Description|Dependencies|Configuration|Commands|Notes|Author)\s*:\s*(.*)$/);
    if (m) {
      current = m[1];
      if (m[2]) buf[current].push(m[2].trim());
      continue;
    }
    if (current && line.match(/^\s*#\s{0,2}[-*]\s+/)) {
      buf[current].push(line.replace(/^\s*#\s{0,2}[-*]\s+/, '').trim());
      continue;
    }
    if (current && line.trim().startsWith('#') && line.includes(':') === false) {
      // continuation
      buf[current].push(line.replace(/^\s*#\s?/, '').trim());
      continue;
    }
  }

  for (const k of keys) {
    const v = buf[k].map(s => s.trim()).filter(Boolean);
    if (v.length) header[k.toLowerCase()] = v;
  }
  return header;
}

function extractEnvVars(header: Record<string, unknown>, text: string): string[] {
  const vars = new Set<string>();
  const cfg = header['configuration'];
  if (Array.isArray(cfg)) {
    for (const line of cfg) {
      const m = String(line).match(/([A-Z0-9_]{3,})/g);
      if (m) m.forEach(v => vars.add(v));
    }
  }
  // heuristic: HUBOT_ / GITHUB_ / etc referenced in file
  for (const m of text.matchAll(/process\.env\.([A-Z0-9_]{3,})/g)) vars.add(m[1]);
  return [...vars].sort();
}

function classify(respond: number, hear: number, router: number): ScriptEntry['categoryGuess'] {
  if (router > 0) return 'http_webhook';
  if (respond > 0 && hear === 0) return 'message_respond';
  if (hear > 0 && respond === 0) return 'message_hear';
  if (respond > 0 && hear > 0) return 'message_hear';
  return 'unknown';
}

function complexityScore(respond: number, hear: number, router: number, envVars: number): number {
  return respond * 2 + hear * 2 + router * 5 + Math.min(envVars, 10);
}

const root = path.resolve(env.HUBOT_SCRIPTS_DIR);
if (!fs.existsSync(root)) {
  logger.warn({ root }, 'HUBOT_SCRIPTS_DIR does not exist; inventory will be empty');
  fs.mkdirSync(path.resolve('manifest'), { recursive: true });
  fs.writeFileSync('manifest/scripts.json', JSON.stringify([], null, 2));
  fs.writeFileSync('manifest/commands.csv', 'script,file,command\n');
  process.exit(0);
}

const files = walk(root);
const entries: ScriptEntry[] = [];

for (const file of files) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  const text = fs.readFileSync(file, 'utf-8');

  const header = parseHeader(text);
  const respondCount = (text.match(/robot\.respond/g) || []).length;
  const hearCount = (text.match(/robot\.hear/g) || []).length;
  const routerCount = (text.match(/robot\.router/g) || []).length;

  const envVars = extractEnvVars(header, text);

  // Best-effort pattern extraction: capture line containing robot.respond/hear
  const patterns: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.includes('robot.respond') || line.includes('robot.hear')) {
      patterns.push(line.trim().slice(0, 240));
    }
  }

  const language = file.endsWith('.coffee') ? 'coffee' : 'js';
  const categoryGuess = classify(respondCount, hearCount, routerCount);

  entries.push({
    id: hashId(rel),
    filePath: rel,
    language,
    header,
    detected: { respondCount, hearCount, routerCount, envVars, patterns: patterns.slice(0, 20) },
    categoryGuess,
    complexityScore: complexityScore(respondCount, hearCount, routerCount, envVars.length),
    migrationStatus: 'todo',
    replacement: null
  });
}

fs.mkdirSync(path.resolve('manifest'), { recursive: true });
fs.writeFileSync('manifest/scripts.json', JSON.stringify(entries, null, 2));

// commands.csv from header.commands (best-effort)
let csv = 'script,file,command\n';
for (const e of entries) {
  const cmds = (e.header as any).commands;
  if (Array.isArray(cmds)) {
    for (const c of cmds) {
      const cmd = String(c).replaceAll('\n', ' ').replaceAll('\r', ' ').trim();
      if (cmd) csv += `${e.id},${e.filePath},"${cmd.replaceAll('"', '""')}"\n`;
    }
  }
}
fs.writeFileSync('manifest/commands.csv', csv);

logger.info({ count: entries.length }, 'Inventory generated');

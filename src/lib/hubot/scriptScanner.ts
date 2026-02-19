import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseHubotHeader, type HubotHeader } from './headerParser.js';
import { calculateComplexity, classifyScript, type HubotCategory } from './classifier.js';

export interface ScriptScanEntry {
  id: string;
  filePath: string;
  language: 'coffee' | 'js';
  header: HubotHeader;
  detected: {
    respondCount: number;
    hearCount: number;
    routerCount: number;
    envVars: string[];
    patterns: string[];
  };
  categoryGuess: HubotCategory;
  complexityScore: number;
  migrationStatus: 'todo';
  replacement: null;
}

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

function extractEnvVars(header: HubotHeader, text: string): string[] {
  const vars = new Set<string>();
  if (Array.isArray(header.configuration)) {
    for (const line of header.configuration) {
      const m = String(line).match(/([A-Z0-9_]{3,})/g);
      if (m) m.forEach((v) => vars.add(v));
    }
  }
  for (const m of text.matchAll(/process\.env\.([A-Z0-9_]{3,})/g)) vars.add(m[1]);
  return [...vars].sort();
}

export function scanHubotScripts(rootDir: string): ScriptScanEntry[] {
  const root = path.resolve(rootDir);
  if (!fs.existsSync(root)) return [];

  const files = walk(root);
  const entries: ScriptScanEntry[] = [];

  for (const file of files) {
    const rel = path.relative(root, file).replaceAll('\\', '/');
    const text = fs.readFileSync(file, 'utf-8');
    const header = parseHubotHeader(text);
    const respondCount = (text.match(/robot\.respond/g) || []).length;
    const hearCount = (text.match(/robot\.hear/g) || []).length;
    const routerCount = (text.match(/robot\.router/g) || []).length;
    const envVars = extractEnvVars(header, text);

    const patterns: string[] = [];
    for (const line of text.split(/\r?\n/)) {
      if (line.includes('robot.respond') || line.includes('robot.hear')) {
        patterns.push(line.trim().slice(0, 240));
      }
    }

    entries.push({
      id: hashId(rel),
      filePath: rel,
      language: file.endsWith('.coffee') ? 'coffee' : 'js',
      header,
      detected: {
        respondCount,
        hearCount,
        routerCount,
        envVars,
        patterns: patterns.slice(0, 20)
      },
      categoryGuess: classifyScript(respondCount, hearCount, routerCount),
      complexityScore: calculateComplexity(respondCount, hearCount, routerCount, envVars.length),
      migrationStatus: 'todo',
      replacement: null
    });
  }

  return entries;
}

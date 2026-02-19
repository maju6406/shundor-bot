import fs from 'node:fs';
import path from 'node:path';
import { env } from '../../src/lib/env.js';

type Status = 'todo' | 'in_progress' | 'done' | 'skipped';

type Entry = {
  id: string;
  filePath: string;
  categoryGuess: string;
  complexityScore: number;
  migrationStatus: Status;
  header?: {
    commands?: string[];
  };
  detected?: {
    respondCount?: number;
    hearCount?: number;
    envVars?: string[];
  };
};

type ProgressRow = {
  id: string;
  filePath: string;
  status: Status;
};

type Phase1Bucket = 'external_api' | 'env_config' | 'multi_command' | 'stateful' | 'formatting_edge_cases';

const scriptsPath = path.resolve('manifest/scripts.json');
const progressPath = path.resolve('manifest/progress.json');
const scriptsRoot = path.resolve(env.HUBOT_SCRIPTS_DIR);

const phase1Only = true;
const activeQueueLimit = 40;
const perBucketQueueLimit = 12;
const recentlyCompletedLimit = 20;

const bucketLabels: Record<Phase1Bucket, string> = {
  external_api: 'External API Calls',
  env_config: 'Env Vars / Config',
  multi_command: 'Multi-command Parsing',
  stateful: 'State / Persistence',
  formatting_edge_cases: 'Formatting / Edge Cases'
};

if (!fs.existsSync(scriptsPath)) {
  console.error('manifest/scripts.json not found. Run scanHubotScripts first.');
  process.exit(1);
}

const entries = JSON.parse(fs.readFileSync(scriptsPath, 'utf-8')) as Entry[];

function phase(e: Entry): 1 | 2 | 3 {
  if (e.categoryGuess === 'http_webhook') return 2;
  if (e.complexityScore >= 10) return 2;
  if (e.categoryGuess === 'unknown') return 3;
  return 1;
}

function safeStatus(value: unknown): Status | null {
  if (value === 'todo' || value === 'in_progress' || value === 'done' || value === 'skipped') return value;
  return null;
}

function loadExistingProgress(): Map<string, Status> {
  const map = new Map<string, Status>();
  if (!fs.existsSync(progressPath)) return map;

  const rows = JSON.parse(fs.readFileSync(progressPath, 'utf-8')) as ProgressRow[];
  for (const row of rows) {
    const status = safeStatus(row.status);
    if (!status) continue;
    map.set(`id:${row.id}`, status);
    map.set(`file:${row.filePath}`, status);
  }
  return map;
}

const existingProgress = loadExistingProgress();

function resolveStatus(entry: Entry): Status {
  const fromId = existingProgress.get(`id:${entry.id}`);
  const fromFile = existingProgress.get(`file:${entry.filePath}`);
  const base = fromId ?? fromFile ?? safeStatus(entry.migrationStatus) ?? 'todo';

  const p = phase(entry);
  if (phase1Only && p !== 1) return 'skipped';
  return base;
}

const progress: ProgressRow[] = entries.map((entry) => ({
  id: entry.id,
  filePath: entry.filePath,
  status: resolveStatus(entry)
}));
fs.mkdirSync(path.resolve('manifest'), { recursive: true });
fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));

type Phase1Entry = Entry & { status: Status; bucket: Phase1Bucket };

function loadSourceText(entry: Entry): string {
  const file = path.join(scriptsRoot, entry.filePath);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf-8');
}

function classifyPhase1Bucket(entry: Entry): Phase1Bucket {
  const text = loadSourceText(entry);
  const code = text
    .split(/\r?\n/)
    .filter((line) => !line.match(/^\s*#/))
    .filter((line) => !line.match(/^\s*\/\//))
    .join('\n');
  const lc = code.toLowerCase();

  const commandCount = Array.isArray(entry.header?.commands) ? entry.header.commands.length : 0;
  const hearCount = entry.detected?.hearCount ?? 0;
  const respondCount = entry.detected?.respondCount ?? 0;
  const totalHandlers = hearCount + respondCount;
  const envVarCount = entry.detected?.envVars?.length ?? 0;

  const usesApi = /(robot\.http|http\.request|https\.request|require\(['"]request|request\(|fetch\(|axios|needle|superagent)/i.test(code);
  const usesState = /(robot\.brain|brain\.(get|set)|redis|couchdb|sqlite|postgres|database|store|persist)/i.test(lc);
  const hasComplexRegex = /\/.*(\(\?:|\(\?=|\(\?!|\[[^\]]{8,}|\.\*).*\//.test(code);
  const hasTransformHeavyCode = /(replace\(|split\(|join\(|substring\(|substr\(|trim\(|match\(|exec\()/i.test(code);

  if (usesApi) return 'external_api';
  if (envVarCount > 0) return 'env_config';
  if (usesState) return 'stateful';
  if (commandCount > 1 || totalHandlers > 1) return 'multi_command';
  if (hasComplexRegex || hasTransformHeavyCode) return 'formatting_edge_cases';
  return 'formatting_edge_cases';
}

const phase1Entries: Phase1Entry[] = entries
  .filter((entry) => phase(entry) === 1)
  .map((entry) => ({
    ...entry,
    status: resolveStatus(entry),
    bucket: classifyPhase1Bucket(entry)
  }))
  .sort((a, b) => a.complexityScore - b.complexityScore || a.filePath.localeCompare(b.filePath));

const phase2Count = entries.filter((entry) => phase(entry) === 2).length;
const phase3Count = entries.filter((entry) => phase(entry) === 3).length;

const todoCount = phase1Entries.filter((entry) => entry.status === 'todo').length;
const inProgressCount = phase1Entries.filter((entry) => entry.status === 'in_progress').length;
const doneCount = phase1Entries.filter((entry) => entry.status === 'done').length;
const skippedCount = phase1Entries.filter((entry) => entry.status === 'skipped').length;

const activeQueue = phase1Entries
  .filter((entry) => entry.status === 'todo' || entry.status === 'in_progress')
  .slice(0, activeQueueLimit);

const recentlyCompleted = phase1Entries
  .filter((entry) => entry.status === 'done')
  .slice(0, recentlyCompletedLimit);

function statusSuffix(status: Status): string {
  if (status === 'in_progress') return ' (in_progress)';
  if (status === 'done') return ' (done)';
  if (status === 'skipped') return ' (skipped)';
  return '';
}

function formatEntry(entry: Phase1Entry): string {
  const bucket = bucketLabels[entry.bucket];
  return `- [ ] \`${entry.filePath}\` — score ${entry.complexityScore} — ${bucket}${statusSuffix(entry.status)}`;
}

function section(title: string, rows: Phase1Entry[]): string {
  const lines = [`## ${title}`, ''];
  if (!rows.length) {
    lines.push('- None', '');
    return lines.join('\n');
  }
  for (const row of rows) lines.push(formatEntry(row));
  lines.push('');
  return lines.join('\n');
}

const bucketQueues: Record<Phase1Bucket, Phase1Entry[]> = {
  external_api: [],
  env_config: [],
  multi_command: [],
  stateful: [],
  formatting_edge_cases: []
};

for (const bucket of Object.keys(bucketQueues) as Phase1Bucket[]) {
  bucketQueues[bucket] = phase1Entries
    .filter((entry) => entry.bucket === bucket && (entry.status === 'todo' || entry.status === 'in_progress'))
    .slice(0, perBucketQueueLimit);
}

const migrationMd = [
  '# Migration Checklist',
  '',
  'Generated from `manifest/scripts.json`. Re-run `pnpm inventory` after updating the hubot-scripts clone.',
  '',
  phase1Only
    ? 'Scope: personal-use mode. Phase 2 and Phase 3 are intentionally skipped for now.'
    : 'Scope: full migration mode.',
  '',
  `Current totals: ${phase1Entries.length} Phase 1 scripts | todo ${todoCount} | in_progress ${inProgressCount} | done ${doneCount} | skipped ${skippedCount}`,
  '',
  section(`Active Queue (Top ${activeQueueLimit} easiest first)`, activeQueue),
  section(`External API Calls (Next ${perBucketQueueLimit})`, bucketQueues.external_api),
  section(`Env Vars / Config (Next ${perBucketQueueLimit})`, bucketQueues.env_config),
  section(`Multi-command Parsing (Next ${perBucketQueueLimit})`, bucketQueues.multi_command),
  section(`State / Persistence (Next ${perBucketQueueLimit})`, bucketQueues.stateful),
  section(`Formatting / Edge Cases (Next ${perBucketQueueLimit})`, bucketQueues.formatting_edge_cases),
  section(`Recently Completed (Up to ${recentlyCompletedLimit})`, recentlyCompleted),
  phase1Only ? '## Phase 2/3 Status\n\n- Intentionally skipped in personal-use mode.\n' : ''
].join('\n');

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/MIGRATION.md', migrationMd);

const categoryCounts = {
  external_api: phase1Entries.filter((entry) => entry.bucket === 'external_api').length,
  env_config: phase1Entries.filter((entry) => entry.bucket === 'env_config').length,
  multi_command: phase1Entries.filter((entry) => entry.bucket === 'multi_command').length,
  stateful: phase1Entries.filter((entry) => entry.bucket === 'stateful').length,
  formatting_edge_cases: phase1Entries.filter((entry) => entry.bucket === 'formatting_edge_cases').length
};

const reportMd = [
  '# Migration Report',
  '',
  `Total scripts: ${entries.length}`,
  `Phase 1: ${phase1Entries.length}`,
  `Phase 2: ${phase2Count}`,
  `Phase 3: ${phase3Count}`,
  `Phase 2+3 skipped by scope: ${phase1Only ? phase2Count + phase3Count : 0}`,
  '',
  'Phase 1 status:',
  `- todo: ${todoCount}`,
  `- in_progress: ${inProgressCount}`,
  `- done: ${doneCount}`,
  `- skipped: ${skippedCount}`,
  '',
  'Phase 1 category counts:',
  `- External API Calls: ${categoryCounts.external_api}`,
  `- Env Vars / Config: ${categoryCounts.env_config}`,
  `- Multi-command Parsing: ${categoryCounts.multi_command}`,
  `- State / Persistence: ${categoryCounts.stateful}`,
  `- Formatting / Edge Cases: ${categoryCounts.formatting_edge_cases}`,
  ''
].join('\n');

fs.writeFileSync('docs/REPORT.md', reportMd);
console.log('Backlog generated: docs/MIGRATION.md, docs/REPORT.md, manifest/progress.json');

import fs from 'node:fs';
import path from 'node:path';

type Entry = {
  id: string;
  filePath: string;
  categoryGuess: string;
  complexityScore: number;
  migrationStatus: 'todo' | 'in_progress' | 'done' | 'skipped';
};

const scriptsPath = path.resolve('manifest/scripts.json');
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

const progress = entries.map(e => ({ id: e.id, filePath: e.filePath, status: e.migrationStatus ?? 'todo' }));
fs.writeFileSync('manifest/progress.json', JSON.stringify(progress, null, 2));

const p1 = entries.filter(e => phase(e) === 1).sort((a,b)=>a.complexityScore-b.complexityScore);
const p2 = entries.filter(e => phase(e) === 2).sort((a,b)=>a.complexityScore-b.complexityScore);
const p3 = entries.filter(e => phase(e) === 3).sort((a,b)=>a.complexityScore-b.complexityScore);

function block(title: string, arr: Entry[]): string {
  const lines = [`## ${title}`, ''];
  for (const e of arr) {
    lines.push(`- [ ] \`${e.filePath}\` — \`${e.categoryGuess}\` — score ${e.complexityScore}`);
  }
  lines.push('');
  return lines.join('\n');
}

const mig = [
  '# Migration Checklist',
  '',
  'Generated from `manifest/scripts.json`. Re-run `pnpm inventory` after updating the hubot-scripts clone.',
  '',
  block('Phase 1 — Simple message triggers + commands', p1),
  block('Phase 2 — Webhooks/routers + higher complexity', p2),
  block('Phase 3 — Unknown/low-value/optional', p3)
].join('\n');

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/MIGRATION.md', mig);

const report = [
  '# Migration Report',
  '',
  `Total scripts: ${entries.length}`,
  `Phase 1: ${p1.length}`,
  `Phase 2: ${p2.length}`,
  `Phase 3: ${p3.length}`,
  ''
].join('\n');
fs.writeFileSync('docs/REPORT.md', report);
console.log('Backlog generated: docs/MIGRATION.md, docs/REPORT.md, manifest/progress.json');

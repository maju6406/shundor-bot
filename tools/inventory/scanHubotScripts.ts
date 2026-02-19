import fs from 'node:fs';
import path from 'node:path';
import { env } from '../../src/lib/env.js';
import { logger } from '../../src/lib/logger.js';
import { scanHubotScripts } from '../../src/lib/hubot/scriptScanner.js';

const entries = scanHubotScripts(env.HUBOT_SCRIPTS_DIR);

fs.mkdirSync(path.resolve('manifest'), { recursive: true });
fs.writeFileSync('manifest/scripts.json', JSON.stringify(entries, null, 2));

let csv = 'script,file,command\n';
for (const entry of entries) {
  const commands = entry.header.commands;
  if (!Array.isArray(commands)) continue;
  for (const command of commands) {
    const text = String(command).replaceAll('\n', ' ').replaceAll('\r', ' ').trim();
    if (!text) continue;
    csv += `${entry.id},${entry.filePath},"${text.replaceAll('"', '""')}"\n`;
  }
}
fs.writeFileSync('manifest/commands.csv', csv);

if (entries.length === 0) {
  logger.warn({ root: path.resolve(env.HUBOT_SCRIPTS_DIR) }, 'No Hubot scripts found; inventory is empty');
} else {
  logger.info({ count: entries.length }, 'Inventory generated');
}

import fs from 'node:fs';
import path from 'node:path';
import { request } from 'undici';

type UrlRecord = {
  url: string;
  files: string[];
};

type UrlCheckResult = {
  url: string;
  statusCode: number | null;
  ok: boolean;
  error: string | null;
  files: string[];
};

const rootArg = process.argv[2];
const scriptsRoot = path.resolve(rootArg || 'vendor/hubot-scripts/src/scripts');
const outJson = path.resolve('manifest/url-health.json');
const outMd = path.resolve('docs/URL_HEALTH.md');

function walk(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.isFile() && (full.endsWith('.coffee') || full.endsWith('.js'))) out.push(full);
  }
  return out;
}

function normalizeUrl(raw: string): string {
  return raw.replace(/[),.;!?]+$/, '');
}

function extractUrls(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(/https?:\/\/[^\s"'<>`]+/g)) {
    set.add(normalizeUrl(m[0]));
  }
  return [...set];
}

async function checkUrl(url: string): Promise<{ statusCode: number | null; ok: boolean; error: string | null }> {
  try {
    const res = await request(url, {
      method: 'GET',
      maxRedirections: 5,
      headersTimeout: 10000,
      bodyTimeout: 10000,
      headers: {
        'user-agent': 'shundor-bot-url-health-check/1.0'
      }
    });
    await res.body.text();
    return {
      statusCode: res.statusCode,
      ok: res.statusCode === 200,
      error: null
    };
  } catch (error) {
    return {
      statusCode: null,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main(): Promise<void> {
  if (!fs.existsSync(scriptsRoot)) {
    console.error(`scripts directory not found: ${scriptsRoot}`);
    process.exit(1);
  }

  const files = walk(scriptsRoot);
  const byUrl = new Map<string, Set<string>>();

  for (const file of files) {
    const rel = path.relative(scriptsRoot, file).replaceAll('\\', '/');
    const text = fs.readFileSync(file, 'utf-8');
    for (const url of extractUrls(text)) {
      if (!byUrl.has(url)) byUrl.set(url, new Set<string>());
      byUrl.get(url)!.add(rel);
    }
  }

  const urlRecords: UrlRecord[] = [...byUrl.entries()]
    .map(([url, refs]) => ({ url, files: [...refs].sort() }))
    .sort((a, b) => a.url.localeCompare(b.url));

  const results: UrlCheckResult[] = [];
  const concurrency = 8;
  let index = 0;

  async function worker(): Promise<void> {
    while (index < urlRecords.length) {
      const i = index++;
      const record = urlRecords[i];
      const checked = await checkUrl(record.url);
      results.push({
        url: record.url,
        statusCode: checked.statusCode,
        ok: checked.ok,
        error: checked.error,
        files: record.files
      });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, urlRecords.length)) }, () => worker()));
  results.sort((a, b) => a.url.localeCompare(b.url));

  const failing = results.filter((r) => !r.ok);
  const deadOrInvalid = failing.filter(
    (r) => r.statusCode === null || r.statusCode === 404 || r.statusCode === 410
  );
  const otherNon200 = failing.filter(
    (r) => !(r.statusCode === null || r.statusCode === 404 || r.statusCode === 410)
  );

  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(results, null, 2));

  const lines: string[] = [
    '# URL Health Report',
    '',
    `Scanned scripts root: \`${scriptsRoot}\``,
    `Total scripts scanned: ${files.length}`,
    `Total unique URLs found: ${results.length}`,
    `URLs returning 200: ${results.length - failing.length}`,
    `URLs not returning 200: ${failing.length}`,
    `Dead/invalid URLs: ${deadOrInvalid.length}`,
    '',
    '## Dead/Invalid URLs',
    ''
  ];

  if (!deadOrInvalid.length) {
    lines.push('- None');
  } else {
    for (const row of deadOrInvalid) {
      const status = row.statusCode === null ? `ERROR (${row.error ?? 'unknown'})` : String(row.statusCode);
      const refs = row.files.map((f) => `\`${f}\``).join(', ');
      lines.push(`- ${row.url} -> ${status}`);
      lines.push(`  - referenced by: ${refs}`);
    }
  }

  lines.push('', '## Other Non-200 URLs', '');
  if (!otherNon200.length) {
    lines.push('- None');
  } else {
    for (const row of otherNon200) {
      const status = row.statusCode === null ? `ERROR (${row.error ?? 'unknown'})` : String(row.statusCode);
      const refs = row.files.map((f) => `\`${f}\``).join(', ');
      lines.push(`- ${row.url} -> ${status}`);
      lines.push(`  - referenced by: ${refs}`);
    }
  }

  lines.push('', `Raw results: \`${path.relative(process.cwd(), outJson)}\``);
  fs.mkdirSync(path.dirname(outMd), { recursive: true });
  fs.writeFileSync(outMd, lines.join('\n'));

  console.log(`URL health report written: ${path.relative(process.cwd(), outMd)}`);
  console.log(`Raw JSON written: ${path.relative(process.cwd(), outJson)}`);
  console.log(`Total URLs: ${results.length}; failing: ${failing.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

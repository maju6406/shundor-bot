export interface HubotHeader {
  description?: string[];
  dependencies?: string[];
  configuration?: string[];
  commands?: string[];
  notes?: string[];
  author?: string[];
}

export function parseHubotHeader(text: string): HubotHeader {
  const keys = ['Description', 'Dependencies', 'Configuration', 'Commands', 'Notes', 'Author'] as const;
  const out: Record<string, string[]> = {};
  for (const key of keys) out[key] = [];

  let current: (typeof keys)[number] | null = null;
  const lines = text.split(/\r?\n/);

  for (const line of lines.slice(0, 120)) {
    const section = line.match(/^\s*#\s*(Description|Dependencies|Configuration|Commands|Notes|Author)\s*:\s*(.*)$/);
    if (section) {
      current = section[1] as (typeof keys)[number];
      if (section[2]) out[current].push(section[2].trim());
      continue;
    }

    if (current && line.match(/^\s*#\s{0,2}[-*]\s+/)) {
      out[current].push(line.replace(/^\s*#\s{0,2}[-*]\s+/, '').trim());
      continue;
    }

    if (current && line.trim().startsWith('#') && !line.includes(':')) {
      out[current].push(line.replace(/^\s*#\s?/, '').trim());
    }
  }

  const header: HubotHeader = {};
  for (const key of keys) {
    const value = out[key].map((s) => s.trim()).filter(Boolean);
    if (value.length) header[key.toLowerCase() as keyof HubotHeader] = value;
  }

  return header;
}

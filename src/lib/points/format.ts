import { getTopPoints } from './service.js';

type WindowName = 'all' | 'week' | 'month' | 'year';

function titleForWindow(window: WindowName): string {
  if (window === 'week') return 'Top Points This Week';
  if (window === 'month') return 'Top Points This Month';
  if (window === 'year') return 'Top Points This Year';
  return 'Top Points (All Time)';
}

export async function renderPointsLeaderboard(guildId: string, window: WindowName): Promise<string> {
  const rows = await getTopPoints(guildId, window);
  const lines = [`**${titleForWindow(window)}**`];

  if (!rows.length) {
    lines.push('No points yet.');
    return lines.join('\n');
  }

  rows.forEach((row, index) => {
    lines.push(`${index + 1}. <@${row.userId}> — ${row.points}`);
  });

  return lines.join('\n');
}

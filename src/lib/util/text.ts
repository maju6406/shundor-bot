export function stripMassMentions(input: string): string {
  return input.replaceAll('@everyone', '@​everyone').replaceAll('@here', '@​here');
}

export function truncate(input: string, max = 1800): string {
  if (input.length <= max) return input;
  return input.slice(0, Math.max(0, max - 3)) + '...';
}

export function sanitizeReplyText(input: string): string {
  return truncate(stripMassMentions(input));
}

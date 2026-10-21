/** Plain one-line text for a meta description: whitespace collapsed, cut at a word boundary near `max` characters. */
export function summarize(text: string, max = 160) {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

/** Cut to `max` characters with an ellipsis, the way a search result does. */
export function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

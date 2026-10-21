/** 1,284 · 12.9K · 4.2M — full figures while they're short, compact once they're not. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const trim = (n: number) => n.toFixed(1).replace(/\.0$/, '');
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (abs >= 10_000) return `${trim(value / 1_000)}K`;
  return Math.round(value).toLocaleString();
}

/** Axis ticks: one style all the way down (0 · 2.5K · 5K), never "9,500" beside "28.5K". */
export function formatAxis(value: number): string {
  const abs = Math.abs(value);
  const trim = (n: number) => n.toFixed(1).replace(/\.0$/, '');
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(value / 1_000)}K`;
  return String(Math.round(value));
}

export function formatTaka(value: number): string {
  return `৳${formatCompact(value)}`;
}

/** The exact figure, for tooltips and tables: ৳12,345. */
export function formatTakaExact(value: number): string {
  return `৳${Math.round(value).toLocaleString()}`;
}

/** 0.1234 -> "12.3%"; whole percentages drop the decimal ("40%"). */
export function formatPercent(fraction: number, maxDigits = 1): string {
  const pct = fraction * 100;
  return `${Number(pct.toFixed(maxDigits)).toString()}%`;
}

/**
 * Change versus the previous period, as a whole percentage. null when there is nothing to compare
 * against (a percentage change from zero means nothing).
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** "2026-10-20" -> "Oct 20". Parsed as a plain calendar date, so the viewer's timezone can't shift it. */
export function formatDayKey(key: string, withYear = false): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

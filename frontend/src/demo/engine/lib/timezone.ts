/*
 * Calendar days in the store's timezone — a port of backend/src/utils/timezone.js. A "day key" is the plain 'YYYY-MM-DD'
 * string for a calendar date; keys sort and compare as text.
 */

/** The API's STORE_TIMEZONE default; the demo runs on it. */
export const STORE_TIMEZONE = 'Asia/Dhaka';

const keyFormatters = new Map<string, Intl.DateTimeFormat>();
const partFormatters = new Map<string, Intl.DateTimeFormat>();

function keyFormatter(timeZone: string) {
  let formatter = keyFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    keyFormatters.set(timeZone, formatter);
  }
  return formatter;
}

function partFormatter(timeZone: string) {
  let formatter = partFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    partFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The calendar date an instant falls on in `timeZone`. */
export function dayKey(date: Date | string | number, timeZone = STORE_TIMEZONE): string {
  return keyFormatter(timeZone).format(new Date(date));
}

/** Moves a day key forward (or back, with a negative `n`) by whole days. */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** How far `timeZone` is ahead of UTC at that instant, in minutes. */
function offsetMinutes(timeZone: string, date: Date) {
  const parts = Object.fromEntries(
    partFormatter(timeZone)
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, Number(p.value)])
  ) as Record<string, number>;
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** The instant a day begins (00:00 local) in `timeZone`. */
export function startOfDay(key: string, timeZone = STORE_TIMEZONE): Date {
  const [y, m, d] = key.split('-').map(Number);
  const asUtc = Date.UTC(y, m - 1, d);
  let instant = asUtc - offsetMinutes(timeZone, new Date(asUtc)) * 60000;
  instant = asUtc - offsetMinutes(timeZone, new Date(instant)) * 60000;
  return new Date(instant);
}

/** The last `days` day keys ending today in `timeZone`, oldest first. */
export function recentDayKeys(days: number, timeZone = STORE_TIMEZONE, now = new Date()): string[] {
  const today = dayKey(now, timeZone);
  return Array.from({ length: days }, (_, i) => addDays(today, i - (days - 1)));
}

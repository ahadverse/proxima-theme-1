/*
 * Calendar days in a named timezone — the store's, not the server's. A "day key" is the plain
 * 'YYYY-MM-DD' string for a calendar date; keys sort and compare as text, so they work directly as
 * a Mongo range filter and as a chart's x value.
 */

const keyFormatters = new Map();
const partFormatters = new Map();

function keyFormatter(timeZone) {
  if (!keyFormatters.has(timeZone)) {
    // en-CA formats as YYYY-MM-DD.
    keyFormatters.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    );
  }
  return keyFormatters.get(timeZone);
}

function partFormatter(timeZone) {
  if (!partFormatters.has(timeZone)) {
    partFormatters.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      })
    );
  }
  return partFormatters.get(timeZone);
}

/** The calendar date an instant falls on in `timeZone`. */
export function dayKey(date, timeZone) {
  return keyFormatter(timeZone).format(date);
}

/** Moves a day key forward (or back, with a negative `n`) by whole days. */
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** How far `timeZone` is ahead of UTC at that instant, in minutes. */
function offsetMinutes(timeZone, date) {
  const parts = Object.fromEntries(
    partFormatter(timeZone)
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, Number(p.value)])
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** The instant a day begins (00:00 local) in `timeZone`. */
export function startOfDay(key, timeZone) {
  const [y, m, d] = key.split('-').map(Number);
  const asUtc = Date.UTC(y, m - 1, d);
  // Read the offset at the answer itself, not at the guess — they differ when a DST change falls
  // between the two.
  let instant = asUtc - offsetMinutes(timeZone, new Date(asUtc)) * 60000;
  instant = asUtc - offsetMinutes(timeZone, new Date(instant)) * 60000;
  return new Date(instant);
}

/** The last `days` day keys ending today in `timeZone`, oldest first. */
export function recentDayKeys(days, timeZone, now = new Date()) {
  const today = dayKey(now, timeZone);
  return Array.from({ length: days }, (_, i) => addDays(today, i - (days - 1)));
}

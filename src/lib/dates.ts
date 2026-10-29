// All day bucketing is in IST (UTC+05:30) so numbers don't depend on the viewer's time zone.

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD of an instant, in IST. */
export function istDay(ts: string | Date): string {
  const ms = typeof ts === 'string' ? Date.parse(ts) : ts.getTime();
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** Inclusive list of days from start to end. */
export function dayRange(start: string, end: string): string[] {
  const n = daysBetween(start, end);
  return Array.from({ length: Math.max(n + 1, 0) }, (_, i) => addDays(start, i));
}

/** ISO timestamp for an IST wall-clock time on a given day. */
export function istTimestamp(day: string, hh: number, mm: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - IST_OFFSET_MS + (hh * 60 + mm) * 60 * 1000).toISOString();
}

export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

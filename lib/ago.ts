const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536e3], ['month', 2592e3], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
const fmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

// ago turns an ISO time into "3 hours ago", "yesterday", or "just now" under a minute.
export function ago(iso: string, now = Date.now()): string {
  const secs = (Date.parse(iso) - now) / 1000;
  for (const [unit, size] of UNITS) if (Math.abs(secs) >= size) return fmt.format(Math.round(secs / size), unit);
  return 'just now';
}

import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536e3], ['month', 2592e3], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];

// ago turns an ISO time into "3 hours ago", "yesterday", or "just now" under a minute, in i18n's language.
export function ago(i18n: I18n, iso: string, now = Date.now()): string {
  const secs = (Date.parse(iso) - now) / 1000;
  const fmt = new Intl.RelativeTimeFormat(i18n.locale, { numeric: 'auto' });
  for (const [unit, size] of UNITS) if (Math.abs(secs) >= size) return fmt.format(Math.round(secs / size), unit);
  return i18n._(msg`just now`);
}

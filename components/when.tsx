'use client';

import { ago } from '@/lib/ago';

// Dates arrive from the API in UTC; people see them in their own time: relative ("3 hours ago")
// with the exact date and time on hover in the browser's timezone and locale.
const exact = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function When({ iso, className }: { iso: string; className?: string }) {
  return (
    // the server renders in its own zone and clock; the browser's version wins
    <time dateTime={iso} title={exact.format(new Date(iso))} className={className} suppressHydrationWarning>
      {ago(iso)}
    </time>
  );
}

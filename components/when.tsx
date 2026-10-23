'use client';

import { useLingui } from '@lingui/react';
import { ago } from '@/lib/ago';
import { dates } from '@/lib/i18n';

// Dates arrive from the API in UTC; people see them in their own time: relative ("3 hours ago")
// with the exact date and time on hover in the browser's timezone and the app's language.
export function When({ iso, className }: { iso: string; className?: string }) {
  const { i18n } = useLingui();
  return (
    // the server renders in its own zone and clock; the browser's version wins
    <time dateTime={iso} title={dates(i18n, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))} className={className} suppressHydrationWarning>
      {ago(i18n, iso)}
    </time>
  );
}

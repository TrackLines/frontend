'use client';

import { useLingui } from '@lingui/react/macro';
import { CalendarClockIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { dates } from '@/lib/i18n';
import { dueState, dueText, localDay } from '@/lib/due';

// DueBadge: a ticket's due date as a countdown (TL-632): red once overdue, highlighted today and
// tomorrow, plain further out; the date itself on hover. Nothing without a date, or once it's done.
export function DueBadge({ due, done = false, today = localDay() }: { due?: string | null; done?: boolean; today?: string }) {
  const { i18n } = useLingui();
  if (!due || done) return null;
  const state = dueState(due, today);
  const tone = state === 'overdue' ? 'border-destructive/40 text-destructive'
    : state === 'later' ? 'text-muted-foreground' : 'border-amber-500/50 text-amber-700 dark:text-amber-400';
  const date = dates(i18n, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${due}T00:00:00Z`));
  return (
    <Badge variant="outline" className={tone} title={date} data-due={state}>
      <CalendarClockIcon aria-hidden /> {dueText(i18n, due, today)}
    </Badge>
  );
}

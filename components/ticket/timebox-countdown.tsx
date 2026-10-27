'use client';

import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatTimebox } from '@/components/ticket/ticket-type';
import { formatDuration, timeboxStatus } from '@/lib/ticket/timebox';

const amber = 'border-amber-500/50 text-amber-700 dark:text-amber-300';

// TimeboxCountdown shows a spike's timebox live (TL-506): a static "timebox 1d 4h" before it starts,
// then business-hours remaining while In Progress (ticking each minute), flipping to "over by …" past
// zero; frozen at the final figure once done. Nothing when the spike has no timebox.
export function TimeboxCountdown({ startedAt, doneAt, days, hours }: {
  startedAt?: string | null; doneAt?: string | null; days?: number | null; hours?: number | null;
}) {
  const { i18n } = useLingui();
  const [now, setNow] = useState(() => new Date());
  const live = Boolean(startedAt) && !doneAt; // only tick while In Progress
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [live]);

  const tb = formatTimebox(i18n, days, hours);
  if (!tb) return null; // no timebox set

  const status = timeboxStatus({ startedAt, doneAt, days, hours }, now);
  if (status.state === 'not_started') {
    return <Badge variant="outline" className={amber} title={i18n._(msg`Spike timebox`)}><Trans>timebox {tb}</Trans></Badge>;
  }
  const title = i18n._(msg`Timebox ${tb} (business hours)`);
  if (status.state === 'over') {
    const over = formatDuration(i18n, -status.remainingMins);
    return <Badge variant="destructive" title={title}><Trans>over timebox by {over}</Trans></Badge>;
  }
  const left = formatDuration(i18n, status.remainingMins);
  const label = doneAt ? i18n._(msg`within timebox · ${left} spare`) : i18n._(msg`${left} of timebox left`);
  return <Badge variant="outline" className={amber} title={title}>{label}</Badge>;
}

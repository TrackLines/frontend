'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatTimebox } from '@/components/ticket-type';
import { formatDuration, timeboxStatus } from '@/lib/timebox';

const amber = 'border-amber-500/50 text-amber-700 dark:text-amber-300';

// TimeboxCountdown shows a spike's timebox live (TL-506): a static "timebox 1d 4h" before it starts,
// then business-hours remaining while In Progress (ticking each minute), flipping to "over by …" past
// zero; frozen at the final figure once done. Nothing when the spike has no timebox.
export function TimeboxCountdown({ startedAt, doneAt, days, hours }: {
  startedAt?: string | null; doneAt?: string | null; days?: number | null; hours?: number | null;
}) {
  const [now, setNow] = useState(() => new Date());
  const live = Boolean(startedAt) && !doneAt; // only tick while In Progress
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [live]);

  const tb = formatTimebox(days, hours);
  if (!tb) return null; // no timebox set

  const status = timeboxStatus({ startedAt, doneAt, days, hours }, now);
  if (status.state === 'not_started') {
    return <Badge variant="outline" className={amber} title="Spike timebox">timebox {tb}</Badge>;
  }
  if (status.state === 'over') {
    return <Badge variant="destructive" title={`Timebox ${tb} (business hours)`}>over timebox by {formatDuration(-status.remainingMins)}</Badge>;
  }
  const label = doneAt ? `within timebox · ${formatDuration(status.remainingMins)} spare` : `${formatDuration(status.remainingMins)} of timebox left`;
  return <Badge variant="outline" className={amber} title={`Timebox ${tb} (business hours)`}>{label}</Badge>;
}

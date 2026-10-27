'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { awayText, isAway, nextPresent } from '@/lib/work/away';
import type { Assignee } from '@/lib/api';
import { DraggableFace } from '@/components/live/person-face';
import { cn } from '@/lib/utils';
import { clock, remaining, reviewing, speakerName, turnTitle, waiting, type Standup } from '@/lib/live/standup';

type Props = { standup: Standup; onAction: (action: 'next' | 'previous' | 'jump' | 'pause' | 'resume' | 'end', index?: number) => void; goal?: string; canRun?: boolean; people?: Assignee[] | null };

// StandupPanel: the standup as a sidebar left of the board (TL-237, after Jira's): the clock with
// play/pause, then the running order top to bottom with the speaker highlighted. The board beside it
// shows the speaker's tickets (all tickets during the board review).
// canRun: the host (TL-235); everyone else sees the clock and order, but can't change them.
export function StandupPanel({ standup, onAction, goal, canRun = true, people = null }: Props) {
  const { t, i18n } = useLingui();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const left = remaining(standup, now);
  const paused = standup.runningSince === null;
  const notStarted = waiting(standup); // opens stopped until the host starts it
  const review = reviewing(standup);
  const last = standup.index === standup.people.length; // the review is the last step
  const steps = [...standup.people.map((p) => speakerName(p, people, i18n)), t`Board Review`];

  return (
    <aside aria-label={t`Standup`} className="sticky top-0 grid w-64 shrink-0 content-start gap-4 self-start rounded-xl border bg-card p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold"><Trans>Standup</Trans></h2>
        {canRun && <Button size="sm" variant="ghost" onClick={() => onAction('end')}>{last ? t`Finish` : t`End`}</Button>}
      </div>
      {/* everyone's update is against the sprint goal */}
      {goal && <p className="text-xs"><span className="text-muted-foreground"><Trans>Sprint goal:</Trans></span> <span className="font-medium">{goal}</span></p>}

      <div className="grid gap-1">
        <div className="flex items-center gap-2">
          <span role="timer" aria-live="off" className={cn('font-mono text-3xl tabular-nums', left < 0 && 'text-destructive')}>{clock(left, i18n)}</span>
          {canRun && (notStarted || paused
            ? <Button size="icon-sm" variant={notStarted ? 'default' : 'ghost'} aria-label={notStarted ? t`Start` : t`Resume`} title={notStarted ? t`Start the clock once everyone has joined` : t`Resume`} onClick={() => onAction('resume')}><PlayIcon /></Button>
            : <Button size="icon-sm" variant="ghost" aria-label={t`Pause`} onClick={() => onAction('pause')}><PauseIcon /></Button>)}
        </div>
        <p className="text-xs text-muted-foreground">
          {review ? t`Board Review: everything, together` : turnTitle(steps[standup.index], i18n)}
          {notStarted ? ` · ${t`waiting to start`}` : paused ? ` · ${t`paused`}` : ''}
        </p>
      </div>

      <ol className="grid gap-0.5" aria-label={t`Running order`}>
        {steps.map((label, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {/* the host drags faces onto tickets to assign them (TL-266); the order stays as it is */}
            {i < standup.people.length ? <DraggableFace id={standup.people[i].id} people={people} disabled={!canRun} /> : <span className="size-6 shrink-0" />}
            <Button
              size="sm"
              variant="ghost"
              aria-current={i === standup.index ? 'step' : undefined}
              className={cn('min-w-0 flex-1 justify-start', i === standup.index && 'bg-accent font-semibold', i < standup.index && 'text-muted-foreground line-through', !canRun && 'pointer-events-none')}
              tabIndex={canRun ? undefined : -1}
              onClick={canRun ? () => onAction('jump', i) : undefined}
            >
              {label}
              {i < standup.people.length && isAway(standup.people[i].id, people) && (
                <span className="ml-auto shrink-0 text-xs font-normal text-muted-foreground" title={awayText(people?.find((p) => p.id === standup.people[i].id), i18n) ?? undefined}><Trans>On holiday</Trans></span>
              )}
            </Button>
          </li>
        ))}
      </ol>

      {canRun && (
        <div className="flex justify-between gap-2">
          <Button size="sm" variant="outline" disabled={standup.index === 0} onClick={() => onAction('previous')}><ChevronLeftIcon /> <Trans>Previous</Trans></Button>
          {/* Next skips anyone on holiday (TL-410); the host can still click their name */}
          {!last && <Button size="sm" onClick={() => {
            const to = nextPresent(standup.people.map((p) => p.id), standup.index, people);
            if (to === standup.index + 1) onAction('next');
            else onAction('jump', to);
          }}><Trans>Next</Trans> <ChevronRightIcon /></Button>}
        </div>
      )}
    </aside>
  );
}

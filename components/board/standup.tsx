'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { clock, goTo, pause, remaining, resume, reviewing, type Standup } from '@/lib/standup';

type Props = { standup: Standup; onChange: (s: Standup) => void; onEnd: () => void };

// StandupPanel runs the standup over the board: who's speaking, their clock, and the running order.
// The board under it shows the speaker's tickets (all tickets during the clean-board review).
export function StandupPanel({ standup, onChange, onEnd }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const left = remaining(standup, now);
  const paused = standup.runningSince === null;
  const review = reviewing(standup);
  const last = standup.index === standup.people.length; // the review is the last step
  const jump = (index: number) => onChange(goTo(standup, index, Date.now()));

  return (
    <section aria-label="Standup" className="grid gap-3 border-b bg-muted/40 px-6 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-semibold">
          {review ? 'Clean board: everything, together' : `${standup.people[standup.index].label}’s turn`}
        </span>
        <span role="timer" aria-live="off" className={cn('font-mono tabular-nums', left < 0 && 'font-semibold text-destructive')}>
          {clock(left)}{paused && ' (paused)'}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={standup.index === 0} onClick={() => jump(standup.index - 1)}>Previous</Button>
          <Button size="sm" variant="outline" onClick={() => onChange(paused ? resume(standup, Date.now()) : pause(standup, Date.now()))}>
            {paused ? 'Resume' : 'Pause'}
          </Button>
          {last
            ? <Button size="sm" onClick={onEnd}>Finish standup</Button>
            : <Button size="sm" onClick={() => jump(standup.index + 1)}>{standup.index === standup.people.length - 1 ? 'Clean board' : 'Next'}</Button>}
          {!last && <Button size="sm" variant="ghost" onClick={onEnd}>End</Button>}
        </div>
      </div>
      <ol className="flex flex-wrap gap-2" aria-label="Running order">
        {standup.people.map((p, i) => (
          <li key={p.id}>
            <Button
              size="sm"
              variant={i === standup.index ? 'default' : 'ghost'}
              aria-current={i === standup.index ? 'step' : undefined}
              className={cn(i < standup.index && 'text-muted-foreground line-through')}
              onClick={() => jump(i)}
            >
              {p.label}
            </Button>
          </li>
        ))}
        <li>
          <Button size="sm" variant={review ? 'default' : 'ghost'} aria-current={review ? 'step' : undefined} onClick={() => jump(standup.people.length)}>
            Clean board
          </Button>
        </li>
      </ol>
    </section>
  );
}

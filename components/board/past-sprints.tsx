'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { TypeBadge } from '@/components/ticket-type';
import { EstimateBadge } from './estimate';
import { PriorityBadge } from './priority-badge';
import { BurnChart } from './velocity';
import { sprints, type Sprint, type SprintDetail } from '@/lib/api';

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const range = (s: Sprint) => `${day.format(new Date(s.starts_at))} – ${day.format(new Date(s.closed_at ?? s.ends_at))}`;

// PastSprints lists a board's closed sprints; each opens read-only: what it finished and its burn chart.
export function PastSprints({ boardId, token }: { boardId: string; token: string }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Sprint[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    sprints.list(boardId, token).then((all) => setList(all.filter((s) => s.closed_at)), () => setFailed(true));
  }, [open, boardId]); // reload each time it opens; token refreshes must not refetch

  return (
    <>
      <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { setChosen(null); setOpen(true); }}>Past sprints</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {chosen ? (
            <SprintView id={chosen} token={token} onBack={() => setChosen(null)} />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Past sprints</DialogTitle>
                <DialogDescription>Read-only: what each sprint finished and how it burned down.</DialogDescription>
              </DialogHeader>
              {failed && <p role="alert" className="text-sm text-destructive">Couldn&apos;t load past sprints. Please try again.</p>}
              {!list && !failed && <Skeleton role="status" aria-label="Loading sprints…" className="h-24 w-full" />}
              {list && (
                <ul className="divide-y rounded-lg border">
                  {list.map((s) => (
                    <li key={s.id}>
                      <Button type="button" variant="ghost" onClick={() => setChosen(s.id)} className="h-auto w-full justify-between rounded-none px-4 py-3">
                        <span>Sprint {s.number}</span>
                        <span className="font-normal text-muted-foreground">{range(s)}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SprintView({ id, token, onBack }: { id: string; token: string; onBack: () => void }) {
  const [d, setD] = useState<SprintDetail | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { sprints.get(id, token).then(setD, () => setFailed(true)); }, [id]);

  return (
    <>
      <DialogHeader>
        <Button type="button" variant="ghost" size="sm" className="-ml-2 w-fit" onClick={onBack}><ArrowLeftIcon />All past sprints</Button>
        <DialogTitle>{d ? `Sprint ${d.number}` : 'Sprint'}</DialogTitle>
        {d && (
          <DialogDescription>
            {range(d)} · finished {d.tickets.length} {d.tickets.length === 1 ? 'ticket' : 'tickets'}
            {d.carried_over !== null && `, ${d.carried_over} carried over to the next sprint`}
          </DialogDescription>
        )}
      </DialogHeader>
      {failed && <p role="alert" className="text-sm text-destructive">Couldn&apos;t load this sprint. Please try again.</p>}
      {!d && !failed && <Skeleton role="status" aria-label="Loading sprint…" className="h-56 w-full" />}
      {d && <SprintDetailBody detail={d} />}
    </>
  );
}

// SprintDetailBody is the read-only content: the burn chart, then what the sprint finished.
export function SprintDetailBody({ detail: d }: { detail: SprintDetail }) {
  return (
    <div className="grid gap-6">
      <BurnChart burn={d.burn} unit={d.unit} now={Date.parse(d.closed_at ?? d.ends_at)} closed={d.closed_at !== null} />
      <section className="grid gap-2">
        <h3 className="font-semibold">Finished</h3>
        {d.tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing was finished in this sprint.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {d.tickets.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
                <a href={`/tickets/${t.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">{t.title}</a>
                {t.type && t.type !== 'task' && <TypeBadge type={t.type} />}
                <PriorityBadge priority={t.priority} hideDefault />
                <EstimateBadge estimate={t.estimate} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

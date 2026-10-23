'use client';

import type { I18n } from '@lingui/core';
import { msg, plural } from '@lingui/core/macro';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { ArrowLeftIcon, ChartColumnIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { TypeBadge } from '@/components/ticket-type';
import { EstimateBadge } from './estimate';
import { PriorityBadge } from './priority-badge';
import { BurnChart } from './velocity';
import { sprints, type Sprint, type SprintDetail, type Velocity } from '@/lib/api';
import Link from 'next/link';
import { TicketKey, ticketPath } from '@/components/ticket/ticket-key';
import { dates } from '@/lib/i18n';

const range = (i18n: I18n, s: Sprint) => {
  const day = dates(i18n, { day: 'numeric', month: 'short' });
  return `${day.format(new Date(s.starts_at))} – ${day.format(new Date(s.closed_at ?? s.ends_at))}`;
};

// sprintResult: "5 of 8 points done" (done of what the sprint held at close, as its details say), or
// "5 points done" for a sprint closed before that was recorded.
export function sprintResult(unit: Velocity['unit'], completed: number, planned: number | null | undefined, i18n: I18n): string {
  const n = (v: number) => Math.round(v * 10) / 10;
  const done = n(completed);
  if (planned == null) {
    return unit === 'tickets'
      ? i18n._(msg`${plural(done, { one: '# ticket done', other: '# tickets done' })}`)
      : i18n._(msg`${plural(done, { one: '# point done', other: '# points done' })}`);
  }
  const of = n(planned);
  return unit === 'tickets'
    ? i18n._(msg`${plural(of, { one: `${done} of # ticket done`, other: `${done} of # tickets done` })}`)
    : i18n._(msg`${plural(of, { one: `${done} of # point done`, other: `${done} of # points done` })}`);
}

// PastSprints lists a board's closed sprints, each with what it finished of what it held; each opens
// read-only: what it finished and its burn chart.
// ReportLink: the board's sprint report, to show leadership (TL-400).
export function ReportLink({ boardId }: { boardId: string }) {
  return <Link href={`/reports?board=${boardId}`} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'justify-self-start' })}><ChartColumnIcon /><Trans>Sprint report</Trans></Link>;
}

export function PastSprints({ boardId, token }: { boardId: string; token: string }) {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Sprint[] | null>(null);
  const [velocity, setVelocity] = useState<Velocity | null>(null); // the done / planned numbers per sprint
  const [chosen, setChosen] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    sprints.list(boardId, token).then((all) => setList(all.filter((s) => s.closed_at)), () => setFailed(true));
    sprints.velocity(boardId, token).then(setVelocity, () => setVelocity(null)); // without it, rows just lack the numbers
  }, [open, boardId]); // reload each time it opens; token refreshes must not refetch

  return (
    <>
      <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { setChosen(null); setOpen(true); }}><Trans>Past sprints</Trans></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {chosen ? (
            <SprintView id={chosen} token={token} onBack={() => setChosen(null)} />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle><Trans>Past sprints</Trans></DialogTitle>
                <DialogDescription><Trans>Read-only: what each sprint finished and how it burned down.</Trans></DialogDescription>
                <ReportLink boardId={boardId} />
              </DialogHeader>
              {failed && <p role="alert" className="text-sm text-destructive"><Trans>Couldn&apos;t load past sprints. Please try again.</Trans></p>}
              {!list && !failed && <Skeleton role="status" aria-label={t`Loading sprints…`} className="h-24 w-full" />}
              {list && list.length === 0 && <p className="text-sm text-muted-foreground"><Trans>No past sprints yet.</Trans></p>}
              {list && list.length > 0 && (
                <PastSprintList list={list} velocity={velocity} onOpen={setChosen} />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// PastSprintList: one row per closed sprint, with its dates and what it finished of what it held (pure, for tests).
export function PastSprintList({ list, velocity, onOpen }: { list: Sprint[]; velocity: Velocity | null; onOpen: (id: string) => void }) {
  const { i18n } = useLingui();
  const result = new Map(velocity?.sprints.map((v) => [v.number, sprintResult(velocity.unit, v.completed, v.planned, i18n)]));
  return (
    <ul className="divide-y rounded-lg border">
      {list.map((s) => (
        <li key={s.id}>
          <Button type="button" variant="ghost" onClick={() => onOpen(s.id)} className="h-auto w-full justify-between gap-4 rounded-none px-4 py-3">
            <span><Trans>Sprint {s.number}</Trans></span>
            <span className="flex flex-col items-end font-normal text-muted-foreground sm:flex-row sm:gap-3">
              {result.has(s.number) && <span className="text-foreground">{result.get(s.number)}</span>}
              <span>{range(i18n, s)}</span>
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function SprintView({ id, token, onBack }: { id: string; token: string; onBack: () => void }) {
  const { t, i18n } = useLingui();
  const [d, setD] = useState<SprintDetail | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { sprints.get(id, token).then(setD, () => setFailed(true)); }, [id]);

  return (
    <>
      <DialogHeader>
        <Button type="button" variant="ghost" size="sm" className="-ml-2 w-fit" onClick={onBack}><ArrowLeftIcon /><Trans>All past sprints</Trans></Button>
        <DialogTitle>{d ? t`Sprint ${d.number}` : t`Sprint`}</DialogTitle>
        {d && (
          <DialogDescription>
            {range(i18n, d)} · {d.carried_over === null
              ? <Plural value={d.tickets.length} one="finished # ticket" other="finished # tickets" />
              : <Trans><Plural value={d.tickets.length} one="finished # ticket" other="finished # tickets" />, {d.carried_over} carried over to the next sprint</Trans>}
          </DialogDescription>
        )}
        {d?.goal && <p className="text-sm"><span className="text-muted-foreground"><Trans>Goal:</Trans></span> <span className="font-medium">{d.goal}</span></p>}
      </DialogHeader>
      {failed && <p role="alert" className="text-sm text-destructive"><Trans>Couldn&apos;t load this sprint. Please try again.</Trans></p>}
      {!d && !failed && <Skeleton role="status" aria-label={t`Loading sprint…`} className="h-56 w-full" />}
      {d && <SprintDetailBody detail={d} />}
    </>
  );
}

// SprintDetailBody is the read-only content: the burn chart, then what the sprint finished.
export function SprintDetailBody({ detail: d }: { detail: SprintDetail }) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <BurnChart burn={d.burn} unit={d.unit} now={Date.parse(d.closed_at ?? d.ends_at)} closed={d.closed_at !== null} />
      <section className="grid grid-cols-1 gap-2">
        <h3 className="font-semibold"><Trans>Finished</Trans></h3>
        {d.tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground"><Trans>Nothing was finished in this sprint.</Trans></p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {d.tickets.map((tk) => (
              <li key={tk.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
                <Link href={ticketPath(tk)} className="min-w-0 flex-1 truncate font-medium hover:underline"><TicketKey value={tk.key} />{tk.title}</Link>
                {tk.type && tk.type !== 'task' && <TypeBadge type={tk.type} />}
                <PriorityBadge priority={tk.priority} hideDefault />
                <EstimateBadge estimate={tk.estimate} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

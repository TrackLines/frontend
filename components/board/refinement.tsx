'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TypeBadge } from '@/components/ticket-type';
import { EstimateSelect } from './estimate';
import { ApiError, backlog, plannedSprints, type BacklogTicket, type Board, type PlannedSprint } from '@/lib/api';
import type { EstimateScale } from '@/lib/estimates';
import { capacityView, MAX_PLANNED } from '@/lib/refinement';

type Props = { board: Board; token: string; canManage: boolean; onClose: () => void };

// RefinementMode plans the board's next sprints: the project backlog on one side, up to two
// planned sprints on the other. Tickets go in with one click and are sized in place; each sprint
// shows how full it is against the team's velocity, and an over-full one needs approving.
// ponytail: buttons, not drag and drop; add DnD if planning lots of tickets gets tedious.
export function RefinementMode({ board, token, canManage, onClose }: Props) {
  const [plans, setPlans] = useState<PlannedSprint[] | null>(null);
  const [tickets, setTickets] = useState<BacklogTicket[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scale = board.estimate_scale ?? 'none';

  const load = useCallback(async () => {
    const [ps, page] = await Promise.all([plannedSprints.list(board.id, token), backlog.page(board.project_id, { page: 1, perPage: 100 }, token)]);
    setPlans(ps);
    setTickets(page.tickets.filter((t) => !t.planned_sprint_id)); // planned ones show in their sprint
  }, [board.id, board.project_id, token]);

  useEffect(() => {
    load().catch(() => setError('Couldn’t load the backlog and planned sprints. Please try again.'));
  }, [load]);

  // act runs a change, then reloads (capacity is worked out by the server)
  async function act(change: () => Promise<unknown>, failed: string) {
    setBusy(true);
    setError('');
    try {
      await change();
      await load();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'Only organization admins and this board’s team leaders can do that.'
        : err instanceof ApiError && err.status < 500 ? err.message : failed);
    } finally {
      setBusy(false);
    }
  }

  const planNext = () => act(() => plannedSprints.plan(board.id, board.sprint?.length_days ?? 14, token), 'Couldn’t plan a sprint. Please try again.');

  return (
    <section aria-label="Refinement" className="grid gap-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Refinement</h2>
        <p className="text-sm text-muted-foreground">Plan backlog tickets into the next sprints and size them. Each sprint holds the team’s velocity + 10%.</p>
        <Button size="sm" variant="outline" className="ml-auto" onClick={onClose}>Done refining</Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {plans === null ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid content-start gap-2">
            <h3 className="font-medium">Backlog</h3>
            {tickets.length === 0 && <p className="text-sm text-muted-foreground">Nothing left to plan.</p>}
            <ul className="grid gap-2">
              {tickets.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                  <TypeBadge type={t.type} />
                  <Link href={`/tickets/${t.id}`} className="min-w-0 flex-1 font-medium hover:underline">{t.title}</Link>
                  {plans.map((p) => (
                    <Button key={p.id} size="sm" variant="outline" disabled={busy}
                      onClick={() => act(() => plannedSprints.planTicket(t.id, p.id, token), `Couldn’t plan “${t.title}”. Please try again.`)}>
                      Sprint {p.number}
                    </Button>
                  ))}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid content-start gap-4">
            {plans.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No sprints planned yet. {canManage ? '' : 'An organization admin or this board’s team leader can plan one.'}
              </p>
            )}
            {plans.map((p) => (
              <PlannedSprintCard key={p.id} plan={p} scale={scale} canManage={canManage} busy={busy} token={token} act={act} />
            ))}
            {canManage && plans.length < MAX_PLANNED && (
              <Button size="sm" variant="outline" className="justify-self-start" disabled={busy} onClick={planNext}>
                Plan sprint {(plans.at(-1)?.number ?? (board.sprint?.number ?? 0)) + 1}
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function PlannedSprintCard({ plan, scale, canManage, busy, token, act }: {
  plan: PlannedSprint; scale: EstimateScale; canManage: boolean; busy: boolean; token: string;
  act: (change: () => Promise<unknown>, failed: string) => Promise<void>;
}) {
  const view = capacityView(plan.capacity);
  return (
    <div className="grid gap-3 rounded-lg border p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium">Sprint {plan.number}</h3>
        <span className="text-muted-foreground">{plan.length_days} days</span>
        {view.state === 'over' && <Badge variant="destructive">Needs approval</Badge>}
        {view.state === 'approved' && <Badge variant="secondary">Approved</Badge>}
        {canManage && (
          <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" disabled={busy}
            onClick={() => confirm(`Remove planned sprint ${plan.number}? Its tickets go back to the backlog, unestimated.`) &&
              act(() => plannedSprints.remove(plan.id, token), 'Couldn’t remove the planned sprint. Please try again.')}>
            Remove
          </Button>
        )}
      </div>
      <div className="grid gap-1">
        {view.percent !== null && <Progress value={view.percent} aria-label={`Sprint ${plan.number} capacity`} />}
        <p className={view.state === 'over' ? 'font-medium text-destructive' : 'text-muted-foreground'}>{view.label}</p>
        {view.note && <p className="text-muted-foreground">{view.note}</p>}
        {view.state === 'over' && canManage && (
          <Button size="sm" className="justify-self-start" disabled={busy}
            onClick={() => act(() => plannedSprints.approve(plan.id, token), 'Couldn’t approve. Please try again.')}>
            Approve {plan.capacity.used} {plan.capacity.unit}
          </Button>
        )}
      </div>
      {plan.tickets.length === 0
        ? <p className="text-muted-foreground">No tickets planned yet. Add some from the backlog.</p>
        : (
          <ul className="grid gap-2">
            {plan.tickets.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/tickets/${t.id}`} className="min-w-0 flex-1 hover:underline">{t.title}</Link>
                {scale !== 'none' && (
                  <div className="w-36">
                    <EstimateSelect scale={scale} value={t.estimate ?? ''}
                      onChange={(e) => void act(() => plannedSprints.planTicket(t.id, plan.id, token, e), `Couldn’t size “${t.title}”. Please try again.`)} />
                  </div>
                )}
                <Button size="sm" variant="ghost" disabled={busy}
                  onClick={() => act(() => plannedSprints.planTicket(t.id, null, token), `Couldn’t move “${t.title}” out. Please try again.`)}>
                  Move out
                </Button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

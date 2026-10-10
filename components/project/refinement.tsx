'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TypeBadge } from '@/components/ticket-type';
import { EstimateSelect } from '@/components/board/estimate';
import { ApiError, backlog, organization, plannedSprints, type BacklogTicket, type Board, type OrganizationRole, type PlannedSprint } from '@/lib/api';
import { canManageBoard } from '@/lib/board-access';
import type { EstimateScale } from '@/lib/estimates';
import { capacityView, MAX_PLANNED } from '@/lib/refinement';

type Props = { projectId: string; boards: Board[]; token: string; onClose: () => void };

// RefinementMode plans the project's next sprints from the backlog: unplanned backlog tickets on one
// side, each sprint board's planned sprints (up to two) on the other. Tickets go into a board's sprint
// with one click and are sized in place on that board's scale; each sprint shows how full it is
// against the team's velocity, and an over-full one needs approving.
// ponytail: buttons, not drag and drop; add DnD if planning lots of tickets gets tedious.
export function RefinementMode({ projectId, boards, token, onClose }: Props) {
  const sprintBoards = boards.filter((b) => b.style !== 'kanban');
  const [plans, setPlans] = useState<Record<string, PlannedSprint[]> | null>(null); // by board id
  const [tickets, setTickets] = useState<BacklogTicket[]>([]);
  const [role, setRole] = useState<OrganizationRole | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const boardIds = sprintBoards.map((b) => b.id).join(',');

  const load = useCallback(async () => {
    const [lists, page] = await Promise.all([
      Promise.all(sprintBoards.map((b) => plannedSprints.list(b.id, token))),
      backlog.page(projectId, { page: 1, perPage: 100 }, token),
    ]);
    setPlans(Object.fromEntries(sprintBoards.map((b, i) => [b.id, lists[i]])));
    setTickets(page.tickets.filter((t) => !t.planned_sprint_id)); // planned ones show in their sprint
  }, [boardIds, projectId, token]);

  useEffect(() => {
    load().catch(() => setError('Couldn’t load the backlog and planned sprints. Please try again.'));
    organization.me(token).then(setRole, () => setRole({ user_id: '', org_id: '', admin: false, leads: [] })); // fail closed
  }, [load, token]);

  // act runs a change, then reloads (capacity is worked out by the server)
  async function act(change: () => Promise<unknown>, failed: string) {
    setBusy(true);
    setError('');
    try {
      await change();
      await load();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'Only organization admins and that board’s team leaders can do that.'
        : err instanceof ApiError && err.status < 500 ? err.message : failed);
    } finally {
      setBusy(false);
    }
  }

  const targets = sprintBoards.flatMap((b) => (plans?.[b.id] ?? []).map((p) => ({ board: b, plan: p })));

  return (
    <section aria-label="Refinement" className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">Plan backlog tickets into each team’s next sprints and size them. A sprint holds the team’s velocity + 10%.</p>
        <Button size="sm" variant="outline" className="ml-auto" onClick={onClose}>Done refining</Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {sprintBoards.length === 0 ? <p className="text-sm text-muted-foreground">No sprint boards to plan for yet.</p>
        : plans === null ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid content-start gap-2">
            <h3 className="font-medium">To plan</h3>
            {tickets.length === 0 && <p className="text-sm text-muted-foreground">Nothing left to plan.</p>}
            {tickets.length > 0 && targets.length === 0 && <p className="text-sm text-muted-foreground">Plan a sprint on a board to start adding tickets.</p>}
            <ul className="grid gap-2">
              {tickets.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                  <TypeBadge type={t.type} />
                  <Link href={`/tickets/${t.id}`} className="min-w-0 flex-1 font-medium hover:underline">{t.title}</Link>
                  {targets.map(({ board, plan }) => (
                    <Button key={plan.id} size="sm" variant="outline" disabled={busy}
                      onClick={() => act(() => plannedSprints.planTicket(t.id, plan.id, token), `Couldn’t plan “${t.title}”. Please try again.`)}>
                      {board.name} · Sprint {plan.number}
                    </Button>
                  ))}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid content-start gap-6">
            {sprintBoards.map((b) => {
              const boardPlans = plans[b.id] ?? [];
              const canManage = !!role && canManageBoard(role, b.team_id);
              const nextNumber = (boardPlans.at(-1)?.number ?? b.stats?.sprint_number ?? 0) + 1;
              return (
                <div key={b.id} className="grid gap-3">
                  <h3 className="font-medium"><Link href={`/boards/${b.id}`} className="hover:underline">{b.name}</Link></h3>
                  {boardPlans.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No sprints planned yet.{canManage ? '' : ' An organization admin or this board’s team leader can plan one.'}
                    </p>
                  )}
                  {boardPlans.map((p) => (
                    <PlannedSprintCard key={p.id} plan={p} scale={b.estimate_scale ?? 'none'} canManage={canManage} busy={busy} token={token} act={act} />
                  ))}
                  {canManage && boardPlans.length < MAX_PLANNED && (
                    <Button size="sm" variant="outline" className="justify-self-start" disabled={busy}
                      onClick={() => act(() => plannedSprints.plan(b.id, 14, token), 'Couldn’t plan a sprint. Please try again.')}>
                      Plan sprint {nextNumber}
                    </Button>
                  )}
                </div>
              );
            })}
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

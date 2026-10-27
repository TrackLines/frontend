'use client';

import Link from 'next/link';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TypeBadge } from '@/components/ticket/ticket-type';
import { EstimateSelect } from '@/components/board/estimate';
import { LiveToast } from '@/components/live/live-toast';
import { combined, dropped, type LiveState } from '@/lib/live/live-status';
import { keepStreaming } from '@/lib/hooks/use-board-live';
import { unchanged } from '@/lib/api/unchanged';
import { ApiError, backlog, organization, plannedSprints, streamBoardLive, type BacklogSort, type BacklogTicket, type Board, type OrganizationRole, type PlannedSprint, type Ticket } from '@/lib/api';
import { canManageBoard } from '@/lib/board/board-access';
import type { EstimateScale } from '@/lib/board/estimates';
import { capacityView, MAX_PLANNED } from '@/lib/live/refinement';
import { PriorityFilter } from '@/components/board/priority-filter';
import { BacklogSortSelect } from './backlog-sort';
import { TicketKey, ticketPath } from '@/components/ticket/ticket-key';
import { Input } from '@/components/ui/input';
import { GOAL_MAX } from '@/components/sprint/sprint-bar';

type Props = {
  projectId: string; boards: Board[]; token: string; onClose: () => void;
  version?: number; // bumps when the backlog changed (edited, moved, deleted): reload
  onOpen?: (ticket: Ticket, scale: EstimateScale) => void; // open a ticket's editor in place, staying in refine mode
  ticketActions?: (ticket: BacklogTicket) => ReactNode; // e.g. move to a board, delete
  priorities?: string[];
  onPrioritiesChange?: (priorities: string[]) => void;
  sort?: BacklogSort; // the backlog's order, newest or oldest first too (TL-581)
  onSortChange?: (sort: BacklogSort) => void;
};

// RefinementMode plans the project's next sprints from the backlog: unplanned backlog tickets on one
// side, each sprint board's planned sprints (up to two) on the other. Tickets go into a board's sprint
// with one click and are sized in place on that board's scale; each sprint shows how full it is
// against the team's velocity, and an over-full one needs approving.
// ponytail: buttons, not drag and drop; add DnD if planning lots of tickets gets tedious.
export function RefinementMode({ projectId, boards, token, onClose, version = 0, onOpen, ticketActions, priorities = [], onPrioritiesChange = () => {}, sort = 'manual', onSortChange = () => {} }: Props) {
  const { t } = useLingui();
  const sprintBoards = boards.filter((b) => b.style !== 'kanban');
  const [plans, setPlans] = useState<Record<string, PlannedSprint[]> | null>(null); // by board id
  const [tickets, setTickets] = useState<BacklogTicket[]>([]);
  const [role, setRole] = useState<OrganizationRole | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [liveStates, setLiveStates] = useState<Record<string, LiveState>>({});
  const latestLoad = useRef(0);
  const boardIds = sprintBoards.map((b) => b.id).join(',');

  const tokenRef = useRef(token);
  tokenRef.current = token; // token refreshes (every ~45s) must not reload the view
  const load = useCallback(async () => {
    const request = ++latestLoad.current;
    const tok = tokenRef.current;
    const [lists, page] = await Promise.all([
      Promise.all(sprintBoards.map((b) => plannedSprints.list(b.id, tok))),
      backlog.page(projectId, { page: 1, perPage: 100, priorities, sort, planned: 'exclude' }, tok), // planned ones are in their sprint's card
    ]);
    if (request !== latestLoad.current) return;
    // identical refreshes keep what's on screen, so nothing redraws
    setPlans((current) => unchanged(current, Object.fromEntries(sprintBoards.map((b, i) => [b.id, lists[i]]))));
    // planned ones show in their sprint; epics aren't planned (their sub-tickets are, TL-213)
    setTickets((current) => unchanged(current, page.tickets.filter((tk) => !tk.planned_sprint_id && tk.type !== 'epic')));
  }, [boardIds, projectId, priorities.join(','), sort]);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    load().catch(() => setError(t`Couldn’t load the backlog and planned sprints. Please try again.`));
  }, [load, version]);
  useEffect(() => {
    organization.me(tokenRef.current).then(setRole, () => setRole({ user_id: '', org_id: '', admin: false, leads: [] })); // fail closed
  }, [projectId]);

  useEffect(() => {
    if (!boardIds) return;
    const controller = new AbortController();
    const ids = boardIds.split(',');
    for (const boardId of ids) {
      void keepStreaming(() => streamBoardLive(boardId, tokenRef.current, controller.signal, (event) => {
        if (event.type === 'refinement') loadRef.current().catch(() => setError(t`Couldn’t refresh the live refinement view.`));
      }, () => setLiveStates((current) => ({ ...current, [boardId]: 'live' }))), controller.signal,
      (err) => setLiveStates((current) => ({ ...current, [boardId]: dropped(current[boardId] ?? 'connecting', err) })));
    }
    return () => controller.abort();
  }, [boardIds]); // token refreshes must not reconnect (it showed as Connecting… every ~45s)

  // act runs a change, then reloads (capacity is worked out by the server)
  async function act(change: () => Promise<unknown>, failed: string) {
    setBusy(true);
    setError('');
    try {
      await change();
      await load();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? t`Only organization admins and that board’s team leaders can do that.`
        : err instanceof ApiError && err.status < 500 ? err.message : failed);
    } finally {
      setBusy(false);
    }
  }

  const targets = sprintBoards.flatMap((b) => (plans?.[b.id] ?? []).map((p) => ({ board: b, plan: p })));

  return (
    <section aria-label={t`Refinement`} className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground"><Trans>Plan backlog tickets into each team’s next sprints and size them. A sprint holds the team’s velocity + 10%.</Trans></p>
        {sprintBoards.length > 0 && <LiveToast state={combined(sprintBoards.map((board) => liveStates[board.id] ?? 'connecting'))} />}
        <Button size="sm" variant="outline" className="ml-auto" onClick={onClose}><Trans>Done refining</Trans></Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {sprintBoards.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>No sprint boards to plan for yet.</Trans></p>
        : plans === null ? <p className="text-sm text-muted-foreground"><Trans>Loading…</Trans></p> : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid content-start gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium"><Trans>To plan</Trans></h3>
              <span className="flex flex-wrap items-center gap-2">
                <PriorityFilter priorities={priorities} onPrioritiesChange={onPrioritiesChange} />
                <BacklogSortSelect id="refine-sort" sort={sort} onSortChange={onSortChange} />
              </span>
            </div>
            {tickets.length === 0 && (priorities.length > 0
              ? <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Trans>No tickets match these priorities.</Trans><Button type="button" size="sm" variant="link" className="h-auto p-0" onClick={() => onPrioritiesChange([])}><Trans>Clear filters</Trans></Button></p>
              : <p className="text-sm text-muted-foreground"><Trans>Nothing left to plan.</Trans></p>)}
            {tickets.length > 0 && targets.length === 0 && <p className="text-sm text-muted-foreground"><Trans>Plan a sprint on a board to start adding tickets.</Trans></p>}
            <ul className="grid gap-2">
              {tickets.map((tk) => (
                <li key={tk.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                  <TypeBadge type={tk.type} />
                  <TicketKey value={tk.key} copy />
                  <TicketTitle ticket={tk} onOpen={onOpen && (() => onOpen(tk as unknown as Ticket, 'none'))} className="font-medium" />
                  {targets.map(({ board, plan }) => (
                    <Button key={plan.id} size="sm" variant="outline" disabled={busy}
                      onClick={() => act(() => plannedSprints.planTicket(tk.id, plan.id, token), t`Couldn’t plan “${tk.title}”. Please try again.`)}>
                      {board.name} · <Trans>Sprint {plan.number}</Trans>
                    </Button>
                  ))}
                  {ticketActions?.(tk)}
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
                      {canManage ? <Trans>No sprints planned yet.</Trans> : <Trans>No sprints planned yet. An organization admin or this board’s team leader can plan one.</Trans>}
                    </p>
                  )}
                  {boardPlans.map((p) => (
                    <PlannedSprintCard key={p.id} plan={p} scale={b.estimate_scale ?? 'none'} canManage={canManage} busy={busy} token={token} act={act}
                      onOpen={onOpen && ((tk) => onOpen(tk, b.estimate_scale ?? 'none'))} />
                  ))}
                  {canManage && boardPlans.length < MAX_PLANNED && (
                    <Button size="sm" variant="outline" className="justify-self-start" disabled={busy || (b.to_review ?? 0) > 0}
                      onClick={() => act(() => plannedSprints.plan(b.id, 14, token), t`Couldn’t plan a sprint. Please try again.`)}>
                      <Trans>Plan sprint {nextNumber}</Trans>
                    </Button>
                  )}
                  {(b.to_review ?? 0) > 0 && ( // an imported board settles its set-aside tickets first (TL-545)
                    <p role="note" className="text-sm text-muted-foreground" data-to-review={b.to_review}>
                      <Trans>{b.to_review} imported tickets wait for review: <Link href={`/boards/${b.id}`} className="underline">settle them on the board</Link> before planning its first sprint.</Trans>
                    </p>
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

export function PlannedSprintCard({ plan, scale, canManage, busy, token, act, onOpen }: {
  plan: PlannedSprint; scale: EstimateScale; canManage: boolean; busy: boolean; token: string;
  act: (change: () => Promise<unknown>, failed: string) => Promise<void>;
  onOpen?: (ticket: Ticket) => void;
}) {
  const { t, i18n } = useLingui();
  const view = capacityView(plan.capacity, i18n);
  return (
    <div className="grid gap-3 rounded-lg border p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium"><Trans>Sprint {plan.number}</Trans></h3>
        <span className="text-muted-foreground"><Plural value={plan.length_days} one="# day" other="# days" /></span>
        {view.state === 'over' && <Badge variant="destructive"><Trans>Needs approval</Trans></Badge>}
        {view.state === 'approved' && <Badge variant="secondary"><Trans>Approved</Trans></Badge>}
        {canManage && (
          <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" disabled={busy}
            onClick={() => confirm(t`Remove planned sprint ${plan.number}? Its tickets go back to the backlog, unestimated.`) &&
              act(() => plannedSprints.remove(plan.id, token), t`Couldn’t remove the planned sprint. Please try again.`)}>
            <Trans>Remove</Trans>
          </Button>
        )}
      </div>
      {canManage
        ? <PlannedGoal key={plan.goal ?? ''} plan={plan} busy={busy} save={(goal) => act(() => plannedSprints.update(plan.id, { goal }, token), t`Couldn’t save the goal. Please try again.`)} />
        : plan.goal && <p><span className="text-muted-foreground"><Trans>Goal:</Trans></span> <span className="font-medium">{plan.goal}</span></p>}
      <div className="grid gap-1">
        {view.percent !== null && <Progress value={view.percent} aria-label={t`Sprint ${plan.number} capacity`} />}
        <p className={view.state === 'over' ? 'font-medium text-destructive' : 'text-muted-foreground'}>{view.label}</p>
        {view.availability && <p className="text-muted-foreground">{view.availability}</p>}
        {view.note && <p className="text-muted-foreground">{view.note}</p>}
        {view.state === 'over' && canManage && (
          <Button size="sm" className="justify-self-start" disabled={busy}
            onClick={() => act(() => plannedSprints.approve(plan.id, token), t`Couldn’t approve. Please try again.`)}>
            {plan.capacity.unit === 'points' ? <Trans>Approve {plan.capacity.used} points</Trans> : <Trans>Approve {plan.capacity.used} tickets</Trans>}
          </Button>
        )}
      </div>
      {plan.tickets.length === 0
        ? <p className="text-muted-foreground"><Trans>No tickets planned yet. Add some from the backlog.</Trans></p>
        : (
          <ul className="grid gap-2">
            {plan.tickets.map((tk) => (
              <li key={tk.id} className="flex flex-wrap items-center gap-2">
                <TicketKey value={tk.key} copy />
                <TicketTitle ticket={tk} onOpen={onOpen && (() => onOpen(tk))} />
                {scale !== 'none' && (
                  <div className="w-36">
                    <EstimateSelect scale={scale} value={tk.estimate ?? ''}
                      onChange={(e) => void act(() => plannedSprints.planTicket(tk.id, plan.id, token, e), t`Couldn’t size “${tk.title}”. Please try again.`)} />
                  </div>
                )}
                <Button size="sm" variant="ghost" disabled={busy}
                  onClick={() => act(() => plannedSprints.planTicket(tk.id, null, token), t`Couldn’t move “${tk.title}” out. Please try again.`)}>
                  <Trans>Move out</Trans>
                </Button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

// TicketTitle opens the ticket's editor in place when it can (so refine mode stays open), else links to it.
function TicketTitle({ ticket, onOpen, className = '' }: { ticket: { id: string; key?: string; title: string }; onOpen?: () => void; className?: string }) {
  return onOpen
    ? <Button type="button" variant="link" onClick={onOpen} className={`h-auto min-w-0 flex-1 basis-48 justify-start p-0 text-left whitespace-normal wrap-anywhere text-foreground ${className}`}>{ticket.title}</Button>
    : <Link href={ticketPath(ticket)} className={`min-w-0 flex-1 basis-48 wrap-anywhere hover:underline ${className}`}>{ticket.title}</Link>;
}

// PlannedGoal edits a planned sprint's goal in place: saved when the field loses focus or on Enter.
function PlannedGoal({ plan, busy, save }: { plan: PlannedSprint; busy: boolean; save: (goal: string) => Promise<void> }) {
  const { t } = useLingui();
  const [goal, setGoal] = useState(plan.goal ?? '');
  const commit = () => { if (goal.trim() !== (plan.goal ?? '')) void save(goal.trim()); };
  return (
    <Input
      value={goal} maxLength={GOAL_MAX} disabled={busy} aria-label={t`Sprint ${plan.number} goal`} placeholder={t`Goal for this sprint (optional)`}
      onChange={(e) => setGoal(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
    />
  );
}

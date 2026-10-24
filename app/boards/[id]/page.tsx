'use client';

import { ArchivedBanner } from '@/components/board/board-lifecycle';
import Link from 'next/link';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { LoadError } from '@/components/load-error';
import { LiveToast } from '@/components/live-toast';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { EpicFilter, epicQuery, parseEpic } from '@/components/board/epic-filter';
import { useEffect, useMemo, useState } from 'react';
import { Column } from '@/components/board/column';
import { BoardDnd, DroppableColumn, SortableTicket } from '@/components/board/board-dnd';
import { SprintBar } from '@/components/board/sprint-bar';
import { FlowCharts } from '@/components/board/flow-charts';
import { StandupPanel } from '@/components/board/standup';
import { TicketCard } from '@/components/board/ticket-card';
import { TicketDialog } from '@/components/board/ticket-dialog';
import { CopyLink } from '@/components/copy-link';
import { Button, buttonVariants } from '@/components/ui/button';
import { ApiError, boards, hostedPaths, organization, projects, teams, tickets, type Board, type EpicSummary, type Ticket } from '@/lib/api';
import { FollowedTicket, HostedBar } from '@/components/hosted-bar';
import { followedFilters, followedTicket } from '@/lib/hosted';
import { useHosted } from '@/lib/use-hosted';
import { usePeople } from '@/lib/use-people';
import { unchanged } from '@/lib/unchanged';
import { participants, speaker } from '@/lib/standup';
import { useToken } from '@/lib/use-token';
import { useBoardLive } from '@/lib/use-board-live';
import { canManageBoard, canMoveToBoard } from '@/lib/board-access';
import { NextSprints } from '@/components/board/next-sprints';
import { prefetch, useCachedState } from '@/lib/page-cache';
import { BoardSkeleton } from '@/components/page-skeletons';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { LabelFilter, labelCounts } from '@/components/board/label-filter';
import { parseLabels, parsePriorities, PriorityFilter, ticketFilterQuery } from '@/components/board/priority-filter';
import type { AssigneeFilter } from '@/components/board/assignee-filter';
import { boardAccess, canAddTicket, shownTickets } from '@/lib/board-view';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const focus = useSearchParams().get('ticket'); // /boards/<id>?ticket=<ticket> opens that ticket's modal
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLingui();
  const token = useToken();
  const [board, setBoard] = useCachedState<Board>(`board:${id}`); // last-seen board shows instantly, then refreshes
  const [error, setError] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null); // column id for the "new ticket" dialog
  const [toBacklog, setToBacklog] = useState<Ticket | null>(null); // created on the sprint's last day, so it went to the backlog
  const [canManage, setCanManage] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [permissionBoardId, setPermissionBoardId] = useState('');
  const [permissionError, setPermissionError] = useState(false);
  const [moveBoards, setMoveBoards] = useState<Board[]>([]); // where its tickets can be moved to, for those who can (TL-381)
  const [labelFilter, setLabelFilter] = useState<string[]>(() => parseLabels(searchParams));
  const [epicFilter, setEpicFilter] = useState(() => parseEpic(searchParams)); // ?epic=<id> (TL-215)
  const [epics, setEpics] = useState<EpicSummary[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>(() => parsePriorities(searchParams));
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all');
  const [view, setView] = useState<'board' | 'next'>(() => searchParams.get('view') === 'next' ? 'next' : 'board'); // ?view=next links to it (TL-584)
  const changeView = (next: 'board' | 'next') => {
    setView(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'next') params.set('view', 'next'); else params.delete('view');
    router.replace(`/boards/${id}${params.size ? `?${params}` : ''}`, { scroll: false });
  };
  const { standup, live, start: startSharedStandup, act: actOnStandup } = useBoardLive(id, token);
  const [joinedStandup, setJoinedStandup] = useState(false);
  // hosted standup (TL-226): the host's filters and open ticket show on followers' screens
  const standupPaths = useMemo(() => hostedPaths.standup(id), [id]);
  const hostedStandup = useHosted(standupPaths, token);
  const [hostTicket, setHostTicket] = useState<string | null>(null); // the ticket the host has open
  useEffect(() => { if (joinedStandup) hostedStandup.joinStarted(); else hostedStandup.leave(); }, [joinedStandup]);
  const people = usePeople(token);
  // the host shares what they have open and how the board is filtered
  useEffect(() => {
    if (joinedStandup && hostedStandup.role === 'host') {
      hostedStandup.focus({ ticketId: hostTicket, filters: { labels: labelFilter, priorities: priorityFilter, assignee: [assigneeFilter] } });
    }
  }, [joinedStandup, hostedStandup.role, hostTicket, labelFilter.join(','), priorityFilter.join(','), assigneeFilter]);
  const [startingStandup, setStartingStandup] = useState(false);
  const [standupError, setStandupError] = useState('');

  const loaded = token !== null;
  const load = (background = false) => boards.get(id, token).then(async (next) => {
    setBoard((current) => unchanged(current, next)); // identical refresh: nothing redraws
    setError(null);
    try {
      const role = await organization.me(token);
      setIsAdmin(role.admin);
      setCurrentUserId(role.user_id);
      setCanManage(canManageBoard(role, next.team_id));
      // its own failure only hides Move to board, not the board settings; boards rarely change, so not on auto-refresh
      if (!background) void projects.get(next.project_id, token).then((p) => {
        const others = (p.boards ?? []).filter((b) => b.id !== next.id && !b.archived_at);
        setMoveBoards(canMoveToBoard(role, others) ? others : []);
      }, () => setMoveBoards([]));
      setPermissionBoardId(next.id);
      setPermissionError(false);
    } catch {
      // Keep ordinary ticket work usable, but fail closed for board configuration.
      setIsAdmin(false);
      setCanManage(false);
      setPermissionError(true);
    }
  }, (e) => {
    if (!background) setError(e instanceof ApiError ? e.status : 500);
  });
  useEffect(() => {
    if (!loaded) return;
    void load();
    // load once per board; later token refreshes must not refetch and wipe local edits
  }, [id, loaded]);

  useAutoRefresh(() => load(true), loaded && !addingTo);
  // "← Project" is the likely next click
  useEffect(() => {
    if (board && token) prefetch(`project:${board.project_id}`, () => projects.get(board.project_id, token));
  }, [board?.project_id, loaded]);

  useEffect(() => {
    setLabelFilter(parseLabels(searchParams));
    setPriorityFilter(parsePriorities(searchParams));
    setEpicFilter(parseEpic(searchParams));
  }, [searchParams]);
  // the project's epics, for the epic filter; none is fine (no filter)
  useEffect(() => { if (board?.project_id && token) tickets.epics(board.project_id, token).then(setEpics, () => setEpics([])); }, [board?.project_id, token !== null]);
  const changeEpic = (epic: string) => {
    setEpicFilter(epic);
    const query = epicQuery(searchParams.toString(), epic);
    router.replace(`${window.location.pathname}${query ? `?${query}` : ''}`, { scroll: false });
  };

  const changeFilters = (labels: string[], priorities: string[]) => {
    setLabelFilter(labels);
    setPriorityFilter(priorities);
    const query = ticketFilterQuery(searchParams.toString(), labels, priorities);
    router.replace(`${window.location.pathname}${query ? `?${query}` : ''}`, { scroll: false });
  };
  const changeLabels = (labels: string[]) => changeFilters(labels, priorityFilter);
  const changePriorities = (priorities: string[]) => changeFilters(labelFilter, priorities);

  // local edits: components call the API themselves and report back here
  const updateTickets = (columnId: string, fn: (ts: Ticket[]) => Ticket[]) =>
    setBoard((b) => b && { ...b, columns: b.columns?.map((c) => (c.id === columnId ? { ...c, tickets: fn(c.tickets) } : c)) });

  // everyone on the board's team plus anyone with tickets on it; names from the assignee list
  useEffect(() => { if (!standup) setJoinedStandup(false); }, [standup]);

  async function beginStandup(b: Board) {
    setStartingStandup(true);
    setStandupError('');
    try {
      const [names, members] = await Promise.all([
        tickets.assignees(token).catch(() => []),
        b.team_id ? teams.members(b.team_id, token).catch(() => []) : Promise.resolve([]),
      ]);
      const people = participants(members.map((m) => m.user_id), (b.columns ?? []).flatMap((c) => c.tickets), new Map(names.map((a) => [a.id, a.label])));
      await startSharedStandup(people);
      setJoinedStandup(true);
    } catch {
      setStandupError(t`Couldn’t start the shared standup. Please try again.`);
    } finally {
      setStartingStandup(false);
    }
  }

  if (error) return <LoadError status={error} thing="board" />;
  if (!board || !token) return <BoardSkeleton />;
  const archived = Boolean(board.archived_at); // read-only: history kept, no new work
  const { manage: boardCanManage } = boardAccess({ checkedBoard: permissionBoardId, board: board.id, canManage, isAdmin });
  const kanban = board.style === 'kanban';
  const turn = joinedStandup && standup ? speaker(standup) : null;
  const followedId = followedTicket(hostedStandup.session, hostedStandup.role, hostedStandup.following);
  const followedCol = followedId ? board.columns?.find((c) => c.tickets.some((x) => x.id === followedId)) : undefined;
  const followedOnBoard = followedCol ? { ...followedCol.tickets.find((x) => x.id === followedId)!, column_name: followedCol.name } : undefined;
  // a follower sees the board as the host has it; everyone else uses their own filters
  const following = joinedStandup ? followedFilters(hostedStandup.session, hostedStandup.role, hostedStandup.following) : null;
  const filters = following
    ? { labels: following.labels ?? [], priorities: following.priorities ?? [], assignee: (following.assignee?.[0] ?? 'all') as AssigneeFilter, me: hostedStandup.session?.host ?? currentUserId, turn: turn?.id ?? null }
    : { labels: labelFilter, priorities: priorityFilter, assignee: assigneeFilter, me: currentUserId, turn: turn?.id ?? null, epic: epicFilter };
  const hasVisibleTickets = (board.columns ?? []).some((column) => shownTickets(column.tickets, filters).length > 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-6 py-4">
        <Link href={`/projects/${board.project_id}`} className="text-sm text-muted-foreground hover:underline">← <Trans>Project</Trans></Link>
        <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
        <LabelFilter
          options={labelCounts((board.columns ?? []).flatMap((c) => c.tickets))}
          labels={labelFilter}
          onLabelsChange={changeLabels}
          syncUrl={false}
        />
        <PriorityFilter priorities={priorityFilter} onPrioritiesChange={changePriorities} />
        <EpicFilter epics={epics} epic={epicFilter} onEpicChange={changeEpic} />
        <div role="group" aria-label={t`Quick filter by assignee`} className="flex gap-1">
          <Button type="button" size="sm" variant={assigneeFilter === 'mine' ? 'secondary' : 'ghost'} aria-pressed={assigneeFilter === 'mine'} onClick={() => setAssigneeFilter((filter) => filter === 'mine' ? 'all' : 'mine')}><Trans>My tickets</Trans></Button>
          <Button type="button" size="sm" variant={assigneeFilter === 'unassigned' ? 'secondary' : 'ghost'} aria-pressed={assigneeFilter === 'unassigned'} onClick={() => setAssigneeFilter((filter) => filter === 'unassigned' ? 'all' : 'unassigned')}><Trans>Unassigned</Trans></Button>
        </div>
        {/* the same actions in and out of edit mode, so the header doesn't jump around */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <CopyLink path={`/boards/${board.id}`} token={token} title={t`A board on TrackLin.es`} />
          {/* standup is for running the board, not configuring it */}
          {!joinedStandup && <Button type="button" variant="outline" size="sm" disabled={startingStandup} onClick={() => standup ? setJoinedStandup(true) : void beginStandup(board)}>
            {startingStandup ? t`Starting…` : standup ? t`Join standup` : t`Standup`}
          </Button>}
          {joinedStandup && hostedStandup.session && (
            <HostedBar session={hostedStandup.session} role={hostedStandup.role} following={hostedStandup.following} people={people} noun="standup"
              onFollow={hostedStandup.setFollowing} onLeave={() => setJoinedStandup(false)} onHandOver={hostedStandup.handOver}
              onEnd={() => void actOnStandup('end').catch(() => setStandupError(t`Couldn’t end the standup. Please try again.`))} />
          )}
          {/* only while you're in the standup */ joinedStandup && <LiveToast state={live} />}
          {/* settings and columns have their own page (TL-470) */}
          {boardCanManage && !archived && !joinedStandup && <Link href={`/boards/${board.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}><Trans>Edit board</Trans></Link>}
        </div>
        {board.description && <p className="w-full text-muted-foreground">{board.description}</p>}
      </header>
      <ArchivedBanner board={board} canManage={boardCanManage} token={token} onRestored={() => void load(true)} />
      {permissionError && <p role="status" className="border-b px-6 py-2 text-sm text-muted-foreground"><Trans>Couldn’t verify board permissions. Board settings are hidden until permissions can be checked.</Trans></p>}
      {standupError && <p role="alert" className="border-b px-6 py-2 text-sm text-destructive">{standupError}</p>}
      {focus && !board.columns?.some((c) => c.tickets.some((tk) => tk.id === focus)) && (
        <p role="status" className="border-b px-6 py-3 text-sm text-muted-foreground">
          <Trans>That ticket isn&apos;t on this board&apos;s current view (it may belong to a closed sprint or have moved).{' '}
          <Link href={`/tickets/${focus}`} className="font-medium text-foreground hover:underline">Open the ticket</Link></Trans>
        </p>
      )}
      {toBacklog && (
        <p role="status" className="border-b px-6 py-3 text-sm text-muted-foreground">
          <Trans>The sprint ends today, so “{toBacklog.title}” went to the backlog.</Trans>{' '}
          <Link href={`/tickets/${toBacklog.id}`} className="font-medium text-foreground hover:underline"><Trans>Open the ticket</Trans></Link>{' '}
          <Button type="button" variant="ghost" size="sm" onClick={() => setToBacklog(null)}><Trans>Dismiss</Trans></Button>
        </p>
      )}
      {joinedStandup && (
        <FollowedTicket ticketId={followedTicket(hostedStandup.session, hostedStandup.role, hostedStandup.following)} token={token}
          known={followedOnBoard} onDismiss={() => hostedStandup.setFollowing(false)} />
      )}
      {/* sprint start/close changes which tickets the board shows, so reload */}
      {kanban
        ? <div className="flex flex-wrap items-center justify-between gap-2 border-b px-6 py-3">
            <p className="text-sm text-muted-foreground"><Trans>Kanban board: work flows continuously. Keep each column within its WIP limit.</Trans></p>
            <FlowCharts boardId={board.id} token={token} />
          </div>
        : <SprintBar board={board} token={token} canManage={boardCanManage} onChanged={load} />}
      {/* sprint boards: the board, or what's planned for its next sprints (TL-584) */}
      {!kanban && (
        <div role="group" aria-label={t`Board view`} className="flex gap-1 border-b px-6 py-2">
          <Button type="button" size="sm" variant={view === 'board' ? 'secondary' : 'ghost'} aria-pressed={view === 'board'} onClick={() => changeView('board')}><Trans>Board</Trans></Button>
          <Button type="button" size="sm" variant={view === 'next' ? 'secondary' : 'ghost'} aria-pressed={view === 'next'} onClick={() => changeView('next')}><Trans>Next sprints</Trans></Button>
        </div>
      )}
      {view === 'next' && !kanban ? <NextSprints board={board} token={token} canManage={!!boardCanManage && !archived} /> : <>
      {!hasVisibleTickets && (labelFilter.length > 0 || priorityFilter.length > 0 || assigneeFilter !== 'all') && (
        <p role="status" className="mx-6 mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          <Trans>No tickets match these filters.</Trans>
          <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => { changeFilters([], []); setAssigneeFilter('all'); }}><Trans>Clear filters</Trans></Button>
        </p>
      )}
      <BoardDnd
        boardId={board.id}
        columns={board.columns ?? []}
        onChange={(cols) => setBoard((b) => b && { ...b, columns: cols })}
        // reload quietly after: moving an unassigned ticket assigns it to the mover (TL-266)
        onMove={async (ticketId, columnId, position) => { await tickets.move(ticketId, columnId, position, token); void load(true); }}
        // standup: the host drops a face on a ticket to assign them (TL-266)
        onAssign={joinedStandup && (hostedStandup.role === 'host' || !hostedStandup.session)
          ? async (ticketId, userId) => { await tickets.assign(ticketId, userId, token); await load(true); } : undefined}
        people={people}
      >
      {/* standup: its panel sits left of the columns, like Jira's (TL-237) */}
      <div className="flex flex-1 items-start gap-4 p-6">
      {joinedStandup && standup && <StandupPanel standup={standup} onAction={(action, index) => {
        void actOnStandup(action, index).then(() => setStandupError(''), () => setStandupError(t`Couldn’t update the shared standup. Please try again.`));
      }} goal={board.sprint?.goal} canRun={hostedStandup.role === 'host' || !hostedStandup.session} people={people} />}
      <div className="flex min-w-0 flex-1 items-start gap-4 overflow-x-auto">
        {board.columns?.map((col) => {
          const cols = board.columns ?? [];
          const shown = shownTickets(col.tickets, filters);
          const done = col.id === cols.at(-1)?.id; // last column = Done
          return (
            <div key={col.id} className="min-w-72 flex-1">
              <Column
                column={col} scale={board.estimate_scale} done={done}
                limited={!done && col.id !== cols[0]?.id} // WIP limits are for work in progress: not To do, not Done
                note={kanban && done && (board.hidden_done ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground"><Plural value={board.hidden_done ?? 0} one="# finished over 14 days ago is hidden." other="# finished over 14 days ago are hidden." /></p>
                )}
              >
                <DroppableColumn id={col.id} ticketIds={shown.map((tk) => tk.id)}>
                  {shown.map((tk) => (
                    <SortableTicket key={tk.id} id={tk.id} disabled={archived}>
                      <TicketCard
                        ticket={tk}
                        openOnLoad={tk.id === focus ? { columnName: col.name } : undefined}
                        done={done}
                        scale={board.estimate_scale}
                        readOnly={archived}
                        token={token}
                        move={moveBoards.length > 0 ? { boards: moveBoards, onMoved: () => void load(true) } : undefined}
                        onUpdated={(nt) => updateTickets(col.id, (ts) => ts.map((x) => (x.id === nt.id ? nt : x)))}
                        onReviewed={() => void load(true)}
                        onDeleted={(tid) => updateTickets(col.id, (ts) => ts.filter((x) => x.id !== tid))}
                        onViewChange={(open) => setHostTicket((current) => (open ? tk.id : current === tk.id ? null : current))}
                      />
                    </SortableTicket>
                  ))}
                </DroppableColumn>
                {/* tickets reach Done by being moved there, not created in it; none are added while editing */}
                {canAddTicket({ archived, done, columns: cols.length }) && (
                  <Button variant="ghost" className="justify-start" onClick={() => setAddingTo(col.id)}><Trans>+ Add ticket</Trans></Button>
                )}
              </Column>
            </div>
          );
        })}
      </div>
      </div>
      </BoardDnd>
      </>}
      {addingTo && (
        <TicketDialog
          open
          onOpenChange={(open) => !open && setAddingTo(null)}
          token={token}
          projectId={board.project_id}
          columnId={addingTo}
          scale={board.estimate_scale}
          onSaved={(tk) => (tk.column_id ? updateTickets(tk.column_id, (ts) => [...ts, tk]) : setToBacklog(tk))}
        />
      )}
    </main>
  );
}

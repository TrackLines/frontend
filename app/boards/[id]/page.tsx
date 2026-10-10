'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddColumn, Column } from '@/components/board/column';
import { BoardDnd, DroppableColumn, SortableTicket } from '@/components/board/board-dnd';
import { SprintBar } from '@/components/board/sprint-bar';
import { StandupPanel } from '@/components/board/standup';
import { TicketCard } from '@/components/board/ticket-card';
import { ScaleSetting } from '@/components/board/estimate';
import { StyleSetting } from '@/components/board/board-style';
import { TicketDialog } from '@/components/board/ticket-dialog';
import { EditableTitle } from '@/components/editable-title';
import { NameDialog } from '@/components/name-dialog';
import { CopyLink } from '@/components/copy-link';
import { Button, buttonVariants } from '@/components/ui/button';
import { ApiError, boardTemplates, boards, organization, projects, teams, tickets, type Board, type Ticket } from '@/lib/api';
import { participants, speaker, start as startStandup, type Standup } from '@/lib/standup';
import { useToken } from '@/lib/use-token';
import { canManageBoard } from '@/lib/board-access';
import { prefetch, useCachedState } from '@/lib/page-cache';
import { BoardSkeleton } from '@/components/page-skeletons';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { LabelFilter, filterTicketsByLabels, labelCounts } from '@/components/board/label-filter';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const focus = useSearchParams().get('ticket'); // /boards/<id>?ticket=<ticket> opens that ticket's modal
  const token = useToken();
  const [board, setBoard] = useCachedState<Board>(`board:${id}`); // last-seen board shows instantly, then refreshes
  const [error, setError] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null); // column id for the "new ticket" dialog
  const [toBacklog, setToBacklog] = useState<Ticket | null>(null); // created on the sprint's last day, so it went to the backlog
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [canManage, setCanManage] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissionBoardId, setPermissionBoardId] = useState('');
  const [permissionError, setPermissionError] = useState(false);
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [standup, setStandup] = useState<Standup | null>(null);
  const [startingStandup, setStartingStandup] = useState(false);

  const loaded = token !== null;
  const load = (background = false) => boards.get(id, token).then(async (next) => {
    setBoard(next);
    setError(null);
    try {
      const role = await organization.me(token);
      setIsAdmin(role.admin);
      setCanManage(canManageBoard(role, next.team_id));
      setPermissionBoardId(next.id);
      setPermissionError(false);
    } catch {
      // Keep ordinary ticket work usable, but fail closed for board configuration.
      setIsAdmin(false);
      setCanManage(false);
      setPermissionError(true);
      setEditMode(false);
    }
  }, (e) => {
    if (!background) setError(e instanceof ApiError ? e.status : 500);
  });
  useEffect(() => {
    if (!loaded) return;
    void load();
    // load once per board; later token refreshes must not refetch and wipe local edits
  }, [id, loaded]);

  useAutoRefresh(() => load(true), loaded && !editMode && !addingTo);
  // "← Project" is the likely next click
  useEffect(() => {
    if (board && token) prefetch(`project:${board.project_id}`, () => projects.get(board.project_id, token));
  }, [board?.project_id, loaded]);

  useEffect(() => { if (canManage === false) setEditMode(false); }, [canManage]);

  // local edits: components call the API themselves and report back here
  const updateTickets = (columnId: string, fn: (ts: Ticket[]) => Ticket[]) =>
    setBoard((b) => b && { ...b, columns: b.columns?.map((c) => (c.id === columnId ? { ...c, tickets: fn(c.tickets) } : c)) });

  // everyone on the board's team plus anyone with tickets on it; names from the assignee list
  async function beginStandup(b: Board) {
    setStartingStandup(true);
    try {
      const [names, members] = await Promise.all([
        tickets.assignees(token).catch(() => []),
        b.team_id ? teams.members(b.team_id, token).catch(() => []) : Promise.resolve([]),
      ]);
      const people = participants(members.map((m) => m.user_id), (b.columns ?? []).flatMap((c) => c.tickets), new Map(names.map((a) => [a.id, a.label])));
      setEditMode(false);
      setStandup(startStandup(people, Date.now()));
    } finally {
      setStartingStandup(false);
    }
  }

  if (error === 404) return <Message title="Board not found" body="It may have been deleted, or it belongs to another organization." />;
  if (error) return <Message title="Couldn't load this board" body="Please refresh to try again." />;
  if (!board || !token) return <BoardSkeleton />;
  const boardCanManage = permissionBoardId === board.id && canManage === true;
  const boardIsAdmin = permissionBoardId === board.id && isAdmin;
  const boardEditMode = editMode && boardCanManage;
  const kanban = board.style === 'kanban';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-6 py-4">
        <Link href={`/projects/${board.project_id}`} className="text-sm text-muted-foreground hover:underline">← Project</Link>
        <EditableTitle
          value={board.name}
          label="board"
          editable={boardEditMode}
          className="text-2xl font-bold tracking-tight"
          onSave={async (name) => {
            try { await boards.update(board.id, { name }, token); }
            catch (err) { if (err instanceof ApiError && err.status === 403) throw new Error('Only organization admins and this board’s team leaders can edit it.'); throw err; }
            setBoard((current) => current && { ...current, name });
          }}
        />
        {board.description && <p className="w-full text-muted-foreground">{board.description}</p>}
        <LabelFilter
          options={labelCounts((board.columns ?? []).flatMap((c) => c.tickets))}
          labels={labelFilter}
          onLabelsChange={setLabelFilter}
        />
        {boardEditMode && (
          <>
            {boardIsAdmin && <Button type="button" variant="outline" size="sm" onClick={() => setSavingTemplate(true)}>Save as template</Button>}
            <StyleSetting boardId={board.id} style={board.style ?? 'sprints'} token={token} onChanged={() => void load(true)} />
            <ScaleSetting
              boardId={board.id}
              scale={board.estimate_scale ?? 'none'}
              estimated={(board.columns ?? []).flatMap((c) => c.tickets).filter((t) => t.estimate).length}
              token={token}
              onChanged={() => void load(true)}
            />
          </>
        )}
        <CopyLink path={`/boards/${board.id}`} className="ml-auto" />
        {!standup && <Button type="button" variant="outline" size="sm" disabled={startingStandup} onClick={() => void beginStandup(board)}>
          {startingStandup ? 'Starting…' : 'Standup'}
        </Button>}
        {boardCanManage && !standup && <Button type="button" variant={editMode ? 'secondary' : 'outline'} size="sm" aria-pressed={editMode} onClick={() => setEditMode((editing) => !editing)}>
          {editMode ? 'Done editing' : 'Edit board'}
        </Button>}
      </header>
      {permissionError && <p role="status" className="border-b px-6 py-2 text-sm text-muted-foreground">Couldn’t verify board permissions. Board settings are hidden until permissions can be checked.</p>}
      {permissionBoardId === board.id && !boardCanManage && <p role="note" className="border-b px-6 py-2 text-sm text-muted-foreground">Board settings are managed by organization admins and this board’s team leaders.</p>}
      {focus && !board.columns?.some((c) => c.tickets.some((t) => t.id === focus)) && (
        <p role="status" className="border-b px-6 py-3 text-sm text-muted-foreground">
          That ticket isn&apos;t on this board&apos;s current view (it may belong to a closed sprint or have moved).{' '}
          <Link href={`/tickets/${focus}`} className="font-medium text-foreground hover:underline">Open the ticket</Link>
        </p>
      )}
      {toBacklog && (
        <p role="status" className="border-b px-6 py-3 text-sm text-muted-foreground">
          The sprint ends today, so “{toBacklog.title}” went to the backlog.{' '}
          <Link href={`/tickets/${toBacklog.id}`} className="font-medium text-foreground hover:underline">Open the ticket</Link>{' '}
          <Button type="button" variant="ghost" size="sm" onClick={() => setToBacklog(null)}>Dismiss</Button>
        </p>
      )}
      {standup && <StandupPanel standup={standup} onChange={setStandup} onEnd={() => setStandup(null)} />}
      {/* sprint start/close changes which tickets the board shows, so reload */}
      {kanban
        ? <p className="border-b px-6 py-3 text-sm text-muted-foreground">Kanban board: work flows continuously. Keep each column within its WIP limit.</p>
        : <SprintBar board={board} token={token} canManage={boardCanManage} onChanged={load} />}
      <BoardDnd
        boardId={board.id}
        columns={board.columns ?? []}
        onChange={(cols) => setBoard((b) => b && { ...b, columns: cols })}
        onMove={(ticketId, columnId, position) => tickets.move(ticketId, columnId, position, token)}
      >
      <div className="flex flex-1 items-start gap-4 overflow-x-auto p-6">
        {board.columns?.map((col) => {
          const cols = board.columns ?? [];
          const turn = standup && speaker(standup); // standup: only the speaker's tickets
          const shown = filterTicketsByLabels(col.tickets, labelFilter).filter((t) => !turn || t.assigned_to === turn.id);
          const done = col.id === cols.at(-1)?.id; // last column = Done
          return (
            <div key={col.id} className="min-w-72 flex-1">
              <Column
                column={col} token={token} editMode={boardEditMode}
                note={kanban && done && (board.hidden_done ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">{board.hidden_done} finished over 14 days ago {board.hidden_done === 1 ? 'is' : 'are'} hidden.</p>
                )}
              >
                <DroppableColumn id={col.id} ticketIds={shown.map((t) => t.id)}>
                  {shown.map((t) => (
                    <SortableTicket key={t.id} id={t.id}>
                      <TicketCard
                        ticket={t}
                        openOnLoad={t.id === focus ? { columnName: col.name } : undefined}
                        done={done}
                        scale={board.estimate_scale}
                        token={token}
                        onUpdated={(nt) => updateTickets(col.id, (ts) => ts.map((x) => (x.id === nt.id ? nt : x)))}
                        onDeleted={(tid) => updateTickets(col.id, (ts) => ts.filter((x) => x.id !== tid))}
                      />
                    </SortableTicket>
                  ))}
                </DroppableColumn>
                {/* tickets reach Done by being moved there, not created in it */}
                {!(done && cols.length > 1) && (
                  <Button variant="ghost" className="justify-start" onClick={() => setAddingTo(col.id)}>+ Add ticket</Button>
                )}
              </Column>
            </div>
          );
        })}
        {boardEditMode && (
          <div className="w-72 shrink-0">
            <AddColumn
              boardId={board.id}
              token={token}
              onCreated={(c) => setBoard((b) => b && { ...b, columns: [...(b.columns ?? []), { ...c, tickets: [] }] })}
            />
          </div>
        )}
      </div>
      </BoardDnd>
      <NameDialog
        open={savingTemplate}
        onOpenChange={setSavingTemplate}
        title="Save as template"
        description="New boards can start with this board's columns, WIP limits, style and estimate scale. Tickets aren't copied."
        placeholder="e.g. Our delivery flow"
        initialValue={board.name}
        submitLabel="Save template"
        onSubmit={async (name) => {
          await boardTemplates.saveBoard(name, board.id, token).catch((err) => {
            throw new Error(err instanceof ApiError && err.status === 403 ? 'Only organization admins can save templates.' : 'Couldn’t save the template. Please try again.');
          });
        }}
      />
      {addingTo && (
        <TicketDialog
          open
          onOpenChange={(open) => !open && setAddingTo(null)}
          token={token}
          projectId={board.project_id}
          columnId={addingTo}
          scale={board.estimate_scale}
          onSaved={(t) => (t.column_id ? updateTickets(t.column_id, (ts) => [...ts, t]) : setToBacklog(t))}
        />
      )}
    </main>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>Back to projects</Link>
    </main>
  );
}

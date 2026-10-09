'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddColumn, Column } from '@/components/board/column';
import { BoardDnd, DroppableColumn, SortableTicket } from '@/components/board/board-dnd';
import { SprintBar } from '@/components/board/sprint-bar';
import { TicketCard } from '@/components/board/ticket-card';
import { ScaleSetting } from '@/components/board/estimate';
import { StyleSetting } from '@/components/board/board-style';
import { TicketDialog } from '@/components/board/ticket-dialog';
import { EditableTitle } from '@/components/editable-title';
import { CopyLink } from '@/components/copy-link';
import { Button, buttonVariants } from '@/components/ui/button';
import { ApiError, boards, projects, tickets, type Board, type Ticket } from '@/lib/api';
import { useToken } from '@/lib/use-token';
import { prefetch, useCachedState } from '@/lib/page-cache';
import { BoardSkeleton } from '@/components/page-skeletons';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { LabelFilter, filterTicketsByLabels, labelCounts } from '@/components/board/label-filter';

function columnWidthPct(count: number): string {
  if (count === 0) return '100%';
  const raw = 100 / count;
  // Round down to nearest 5 (gives 30% for 3 cols, 25% for 4, 10% for 7+).
  return `${Math.floor(raw / 5) * 5}%`;
}

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const focus = useSearchParams().get('ticket'); // /boards/<id>?ticket=<ticket> opens that ticket's modal
  const token = useToken();
  const [board, setBoard] = useCachedState<Board>(`board:${id}`); // last-seen board shows instantly, then refreshes
  const [error, setError] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null); // column id for the "new ticket" dialog
  const [editMode, setEditMode] = useState(false);
  const [labelFilter, setLabelFilter] = useState<string[]>([]);

  const loaded = token !== null;
  const load = (background = false) => boards.get(id, token).then((next) => {
    setBoard(next);
    setError(null);
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

  // local edits: components call the API themselves and report back here
  const updateTickets = (columnId: string, fn: (ts: Ticket[]) => Ticket[]) =>
    setBoard((b) => b && { ...b, columns: b.columns?.map((c) => (c.id === columnId ? { ...c, tickets: fn(c.tickets) } : c)) });

  if (error === 404) return <Message title="Board not found" body="It may have been deleted, or it belongs to another organization." />;
  if (error) return <Message title="Couldn't load this board" body="Please refresh to try again." />;
  if (!board || !token) return <BoardSkeleton />;
  const kanban = board.style === 'kanban';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-6 py-4">
        <Link href={`/projects/${board.project_id}`} className="text-sm text-muted-foreground hover:underline">← Project</Link>
        <EditableTitle
          value={board.name}
          label="board"
          editable={editMode}
          className="text-2xl font-bold tracking-tight"
          onSave={async (name) => {
            await boards.update(board.id, { name }, token);
            setBoard((current) => current && { ...current, name });
          }}
        />
        {board.description && <p className="w-full text-muted-foreground">{board.description}</p>}
        <LabelFilter
          options={labelCounts((board.columns ?? []).flatMap((c) => c.tickets))}
          labels={labelFilter}
          onLabelsChange={setLabelFilter}
        />
        {editMode && (
          <>
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
        <Button type="button" variant={editMode ? 'secondary' : 'outline'} size="sm" aria-pressed={editMode} onClick={() => setEditMode((editing) => !editing)}>
          {editMode ? 'Done editing' : 'Edit board'}
        </Button>
      </header>
      {focus && !board.columns?.some((c) => c.tickets.some((t) => t.id === focus)) && (
        <p role="status" className="border-b px-6 py-3 text-sm text-muted-foreground">
          That ticket isn&apos;t on this board&apos;s current view (it may belong to a closed sprint or have moved).{' '}
          <Link href={`/tickets/${focus}`} className="font-medium text-foreground hover:underline">Open the ticket</Link>
        </p>
      )}
      {/* sprint start/close changes which tickets the board shows, so reload */}
      {kanban
        ? <p className="border-b px-6 py-3 text-sm text-muted-foreground">Kanban board: work flows continuously. Keep each column within its WIP limit.</p>
        : <SprintBar board={board} token={token} onChanged={load} />}
      <BoardDnd
        boardId={board.id}
        columns={board.columns ?? []}
        onChange={(cols) => setBoard((b) => b && { ...b, columns: cols })}
        onMove={(ticketId, columnId, position) => tickets.move(ticketId, columnId, position, token)}
      >
      <div className="flex flex-1 items-start gap-4 overflow-x-auto p-6">
        {board.columns?.map((col) => {
          const cols = board.columns ?? [];
          const w = columnWidthPct(cols.length);
          const shown = filterTicketsByLabels(col.tickets, labelFilter);
          const done = col.id === cols.at(-1)?.id; // last column = Done
          return (
            <div key={col.id} style={{ width: w }} className="shrink-0">
              <Column
                column={col} token={token} editMode={editMode}
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
        {editMode && (
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
      {addingTo && (
        <TicketDialog
          open
          onOpenChange={(open) => !open && setAddingTo(null)}
          token={token}
          projectId={board.project_id}
          columnId={addingTo}
          scale={board.estimate_scale}
          onSaved={(t) => updateTickets(t.column_id, (ts) => [...ts, t])}
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

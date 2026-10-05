'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddColumn, Column } from '@/components/board/column';
import { TicketCard } from '@/components/board/ticket-card';
import { TicketDialog } from '@/components/board/ticket-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { ApiError, boards, type Board, type Ticket } from '@/lib/api';
import { useToken } from '@/lib/use-token';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null); // column id for the "new ticket" dialog

  const loaded = token !== null;
  useEffect(() => {
    if (!loaded) return;
    boards.get(id, token).then(setBoard, (e) => setError(e instanceof ApiError ? e.status : 500));
    // load once per board; later token refreshes must not refetch and wipe local edits
  }, [id, loaded]);

  // local edits: components call the API themselves and report back here
  const updateTickets = (columnId: string, fn: (ts: Ticket[]) => Ticket[]) =>
    setBoard((b) => b && { ...b, columns: b.columns?.map((c) => (c.id === columnId ? { ...c, tickets: fn(c.tickets) } : c)) });

  if (error === 404) return <Message title="Board not found" body="It may have been deleted, or it isn't yours." />;
  if (error) return <Message title="Couldn't load this board" body="Please refresh to try again." />;
  if (!board || !token) return <p className="p-8 text-muted-foreground" role="status">Loading board…</p>;

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-6 py-4">
        <Link href={`/projects/${board.project_id}`} className="text-sm text-muted-foreground hover:underline">← Project</Link>
        <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
        {board.description && <p className="w-full text-muted-foreground">{board.description}</p>}
      </header>
      <div className="flex flex-1 items-start gap-4 overflow-x-auto p-6">
        {board.columns?.map((col) => (
          <div key={col.id} className="w-72 shrink-0">
            <Column column={col} token={token}>
              {col.tickets.map((t) => (
                <TicketCard
                  key={t.id}
                  ticket={t}
                  token={token}
                  onUpdated={(nt) => updateTickets(col.id, (ts) => ts.map((x) => (x.id === nt.id ? nt : x)))}
                  onDeleted={(tid) => updateTickets(col.id, (ts) => ts.filter((x) => x.id !== tid))}
                />
              ))}
              <Button variant="ghost" className="justify-start" onClick={() => setAddingTo(col.id)}>+ Add ticket</Button>
            </Column>
          </div>
        ))}
        <div className="w-72 shrink-0">
          <AddColumn
            boardId={board.id}
            token={token}
            onCreated={(c) => setBoard((b) => b && { ...b, columns: [...(b.columns ?? []), { ...c, tickets: [] }] })}
          />
        </div>
      </div>
      {addingTo && (
        <TicketDialog
          open
          onOpenChange={(open) => !open && setAddingTo(null)}
          token={token}
          columnId={addingTo}
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

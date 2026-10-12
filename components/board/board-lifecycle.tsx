'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArchiveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError, boards, type Board } from '@/lib/api';

// lifecycleAction: what can happen to a board. Never used → admins delete it; used → board managers
// archive it (history kept); archived → restore.
export function lifecycleAction(board: Pick<Board, 'deletable' | 'archived_at'>, isAdmin: boolean, canManage: boolean): 'delete' | 'archive' | 'restore' | null {
  if (board.archived_at) return canManage ? 'restore' : null;
  if (board.deletable) return isAdmin ? 'delete' : null;
  return canManage ? 'archive' : null;
}

// BoardLifecycle: Delete or Archive in Edit board mode's settings strip.
export function BoardLifecycle({ board, isAdmin, canManage, token }: { board: Board; isAdmin: boolean; canManage: boolean; token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const action = lifecycleAction(board, isAdmin, canManage);
  if (action !== 'delete' && action !== 'archive') return null;

  async function run() {
    const ok = action === 'delete'
      ? confirm(`Delete “${board.name}”? It has never been used, so nothing is lost.`)
      : confirm(`Archive “${board.name}”? It leaves the project page but keeps its history, and you can restore it from Edit project → Archived boards.`);
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      await (action === 'delete' ? boards.remove(board.id, token) : boards.archive(board.id, token));
      router.push(`/projects/${board.project_id}`);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? err.message
        : err instanceof ApiError && err.status === 403 ? 'Only organization admins and this board’s team leaders can do this.'
        : `Couldn’t ${action} the board. Please try again.`);
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" className={action === 'delete' ? 'text-destructive' : ''} disabled={busy} onClick={() => void run()}>
        {action === 'delete' ? 'Delete board' : <><ArchiveIcon aria-hidden /> Archive board</>}
      </Button>
      {error && <span role="alert" className="text-sm text-destructive">{error}</span>}
    </span>
  );
}

// ArchivedBanner: on an archived board's page; managers can restore it.
export function ArchivedBanner({ board, canManage, token, onRestored }: { board: Board; canManage: boolean; token: string; onRestored: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!board.archived_at) return null;
  async function restore() {
    setBusy(true);
    setError('');
    try {
      await boards.restore(board.id, token);
      onRestored();
    } catch {
      setError('Couldn’t restore the board. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 border-b bg-muted/60 px-6 py-3 text-sm">
      <ArchiveIcon className="size-4" aria-hidden />
      <span>This board is archived. Its history is kept, but it takes no new work.</span>
      {canManage && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void restore()}>{busy ? 'Restoring…' : 'Restore board'}</Button>}
      {error && <span role="alert" className="text-destructive">{error}</span>}
    </div>
  );
}

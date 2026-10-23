'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { When } from '@/components/when';
import { Button } from '@/components/ui/button';
import { boards, type Board } from '@/lib/api';

// ArchivedBoards: a project's archived boards, with Restore.
export function ArchivedBoards({ projectId, token }: { projectId: string; token: string }) {
  const { t } = useLingui();
  const [list, setList] = useState<Board[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { boards.archived(projectId, token).then(setList, () => setError(t`Couldn’t load archived boards.`)); }, [projectId]);

  async function restore(b: Board) {
    setBusy(b.id);
    setError('');
    try {
      await boards.restore(b.id, token);
      setList((l) => l?.filter((x) => x.id !== b.id) ?? l);
    } catch {
      setError(t`Couldn’t restore ${b.name}. Only organization admins and the board’s team leaders can.`);
    } finally {
      setBusy(null);
    }
  }
  return <ArchivedBoardsView list={list} error={error} busy={busy} onRestore={(b) => void restore(b)} />;
}

// ArchivedBoardsView: pure, for tests.
export function ArchivedBoardsView({ list, error, busy, onRestore }: { list: Board[] | null; error: string; busy: string | null; onRestore: (b: Board) => void }) {
  const { t } = useLingui();
  return (
    <div className="grid gap-3">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {list === null ? (!error && <p role="status" className="text-sm text-muted-foreground"><Trans>Loading…</Trans></p>)
        : list.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground"><Trans>No archived boards.</Trans></p>
        : (
          <ul className="divide-y rounded-xl border">
            {list.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3 p-4">
                <Link href={`/boards/${b.id}`} className="min-w-0 flex-1 font-medium hover:underline">{b.name}</Link>
                {b.archived_at && <span className="text-sm text-muted-foreground"><Trans>Archived <When iso={b.archived_at} /></Trans></span>}
                <Button size="sm" variant="outline" disabled={busy === b.id} onClick={() => onRestore(b)}>{busy === b.id ? t`Restoring…` : t`Restore`}</Button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

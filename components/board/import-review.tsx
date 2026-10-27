'use client';

import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { When } from '@/components/common/when';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiError, importReview, tickets, type Board, type ReviewTicket } from '@/lib/api';

// ImportReview: on a board an import made (TL-545), the tickets it set aside, untouched for over 6
// months in the source, to keep or close before the first sprint; the count, and the list to settle.
export function ImportReview({ board, token, canManage, onChanged }: { board: Board; token: string; canManage: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const n = board.to_review ?? 0;
  if (n === 0) return null;
  return (
    <>
      <span role="note" className="text-amber-700 dark:text-amber-400" data-to-review={n}>
        <Plural value={n} one="# imported ticket to review before the first sprint" other="# imported tickets to review before the first sprint" />
      </span>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Trans>Review them</Trans></Button>
      {open && <ReviewDialog board={board} token={token} canManage={canManage} onOpenChange={setOpen} onChanged={onChanged} />}
    </>
  );
}

function ReviewDialog({ board, token, canManage, onOpenChange, onChanged }: {
  board: Board; token: string; canManage: boolean; onOpenChange: (o: boolean) => void; onChanged: () => void;
}) {
  const { t } = useLingui();
  const [list, setList] = useState<ReviewTicket[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { importReview.list(board.id, token).then(setList, () => setList([])); }, [board.id]);
  async function settle(id: string, f: () => Promise<void>) {
    setBusy(id);
    setError('');
    try {
      await f();
      setList((l) => l?.filter((x) => x.id !== id) ?? l);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError && e.status < 500 ? e.message : t`That didn’t work. Please try again.`);
    } finally {
      setBusy(null);
    }
  }
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle><Trans>Imported tickets to review</Trans></DialogTitle>
          <DialogDescription><Trans>Nothing happened to these for over 6 months before the import. Keep each one in the backlog, or close it as won’t do. The first sprint can start once they’re all settled.</Trans></DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {list === null ? <p role="status" className="text-sm text-muted-foreground"><Trans>Loading…</Trans></p>
          : <ReviewList list={list} canManage={canManage} busy={busy}
            onKeep={(id) => void settle(id, () => importReview.keep(board.id, id, token))}
            onClose={(id) => void settle(id, () => tickets.resolve(id, token, 'wont_do', t`Closed in the review after importing: untouched for over 6 months.`))} />}
      </DialogContent>
    </Dialog>
  );
}

// ReviewList: each set-aside ticket with when it last changed in the source, and Keep / Close as won't do.
export function ReviewList({ list, canManage, busy, onKeep, onClose }: {
  list: ReviewTicket[]; canManage: boolean; busy: string | null; onKeep: (id: string) => void; onClose: (id: string) => void;
}) {
  if (list.length === 0) return <p className="text-sm text-muted-foreground"><Trans>All settled: the board can start its first sprint.</Trans></p>;
  return (
    <ul className="grid gap-2 text-sm">
      {!canManage && <li className="text-muted-foreground"><Trans>An organization admin or this board’s team leader settles these.</Trans></li>}
      {list.map((tk) => (
        <li key={tk.id} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2" data-review-ticket={tk.key}>
          <span className="font-mono text-xs text-muted-foreground">{tk.key}</span>
          <span className="min-w-0 flex-1 truncate font-medium">{tk.title}</span>
          <span className="text-muted-foreground"><Trans>last changed <When iso={tk.updated_at} /></Trans></span>
          {tk.url && <a href={tk.url} target="_blank" rel="noreferrer" className="text-muted-foreground underline"><Trans>original</Trans></a>}
          {canManage && (
            <span className="flex gap-1">
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => onKeep(tk.id)}><Trans>Keep</Trans></Button>
              <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => onClose(tk.id)}><Trans>Close as won’t do</Trans></Button>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

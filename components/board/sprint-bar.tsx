'use client';

import { useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { sprints, type Board, type Sprint } from '@/lib/api';
import { LENGTH_PRESETS, sprintStatus } from './sprint-status';
import { Charts } from './velocity';

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

type Props = { board: Board; token: string; onChanged: () => void };

// SprintBar sits under the board header: start a sprint, see time left, close it, browse history.
export function SprintBar({ board, token, onChanged }: Props) {
  const [starting, setStarting] = useState(false);
  const [closing, setClosing] = useState(false);
  const sprint = board.sprint;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-6 py-3 text-sm">
      {sprint ? (
        <>
          <span className="font-semibold">Sprint {sprint.number}</span>
          <span className="text-muted-foreground">
            {day.format(new Date(sprint.starts_at))} – {day.format(new Date(sprint.ends_at))} · {sprint.length_days} days
          </span>
          <Status endsAt={sprint.ends_at} />
          <Button size="sm" variant="outline" onClick={() => setClosing(true)}>Close sprint</Button>
        </>
      ) : (
        <>
          <span className="text-muted-foreground">No sprint running — tickets aren&apos;t time-boxed.</span>
          <Button size="sm" onClick={() => setStarting(true)}>Start sprint</Button>
        </>
      )}
      <History boardId={board.id} token={token} />
      <Charts boardId={board.id} token={token} />
      <StartDialog open={starting} onOpenChange={setStarting} boardId={board.id} token={token} onStarted={onChanged} />
      {sprint && <CloseDialog open={closing} onOpenChange={setClosing} board={board} sprint={sprint} token={token} onClosed={onChanged} />}
    </div>
  );
}

function Status({ endsAt }: { endsAt: string }) {
  const { label, overdue } = sprintStatus(endsAt);
  return <Badge variant={overdue ? 'destructive' : 'secondary'}>{label}</Badge>;
}

function StartDialog({ open, onOpenChange, boardId, token, onStarted }: {
  open: boolean; onOpenChange: (o: boolean) => void; boardId: string; token: string; onStarted: () => void;
}) {
  const [choice, setChoice] = useState<number | 'custom'>(14);
  const [custom, setCustom] = useState('10');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const days = choice === 'custom' ? Number(custom) : choice;
  const valid = Number.isInteger(days) && days >= 1 && days <= 365;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await sprints.start(boardId, days, token);
      onOpenChange(false);
      onStarted();
    } catch {
      setError('Couldn’t start the sprint. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Start a sprint</DialogTitle>
            <DialogDescription>Tickets already on this board join it. When it ends, unfinished tickets move to the next sprint automatically.</DialogDescription>
          </DialogHeader>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Length</legend>
            {LENGTH_PRESETS.map((p) => (
              <label key={p.days} className="flex items-center gap-2">
                <input type="radio" name="length" checked={choice === p.days} onChange={() => setChoice(p.days)} className="accent-primary" />
                {p.label}
              </label>
            ))}
            <label className="flex items-center gap-2">
              <input type="radio" name="length" checked={choice === 'custom'} onChange={() => setChoice('custom')} className="accent-primary" />
              Custom
              <Input
                type="number" min={1} max={365} value={custom} aria-label="Custom length in days"
                className="h-8 w-20" disabled={choice !== 'custom'} onChange={(e) => setCustom(e.target.value)}
              />
              days
            </label>
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving || !valid}>{saving ? 'Starting…' : `Start ${valid ? days + '-day ' : ''}sprint`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({ open, onOpenChange, board, sprint, token, onClosed }: {
  open: boolean; onOpenChange: (o: boolean) => void; board: Board; sprint: Sprint; token: string; onClosed: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // the board's last column counts as "done"; everything else carries over
  const cols = board.columns ?? [];
  const doneCol = cols.at(-1);
  const total = cols.reduce((n, c) => n + c.tickets.length, 0);
  const done = doneCol?.tickets.length ?? 0;
  const carry = total - done;

  async function close() {
    setSaving(true);
    setError('');
    try {
      await sprints.close(sprint.id, token);
      onOpenChange(false);
      onClosed();
    } catch {
      setError('Couldn’t close the sprint. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close sprint {sprint.number}?</DialogTitle>
          <DialogDescription>
            Sprint {sprint.number + 1} starts now ({sprint.length_days} days). {carry} unfinished ticket{carry === 1 ? '' : 's'} move
            {carry === 1 ? 's' : ''} into it, keeping their column; {done} in “{doneCol?.name ?? 'Done'}” stay with sprint {sprint.number}.
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={close} disabled={saving}>{saving ? 'Closing…' : 'Close sprint'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// History lists closed sprints; loaded when opened so the board doesn't pay for it.
function History({ boardId, token }: { boardId: string; token: string }) {
  const [list, setList] = useState<Sprint[] | null>(null);
  return (
    <details
      className="ml-auto"
      onToggle={(e) => { if ((e.target as HTMLDetailsElement).open && !list) sprints.list(boardId, token).then(setList, () => setList([])); }}
    >
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Past sprints</summary>
      <ul className="mt-2 grid gap-1">
        {list === null && <li className="text-muted-foreground">Loading…</li>}
        {list?.filter((s) => s.closed_at).length === 0 && <li className="text-muted-foreground">None yet.</li>}
        {list?.filter((s) => s.closed_at).map((s) => (
          <li key={s.id}>
            Sprint {s.number}: {day.format(new Date(s.starts_at))} – {day.format(new Date(s.closed_at!))}
          </li>
        ))}
      </ul>
    </details>
  );
}

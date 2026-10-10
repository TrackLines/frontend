'use client';

import { useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError, sprints, type Board, type Sprint } from '@/lib/api';
import { LENGTH_PRESETS, sprintLocked, sprintStatus } from './sprint-status';
import { Charts } from './velocity';
import { PastSprints } from './past-sprints';

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type Props = { board: Board; token: string; canManage: boolean; editMode?: boolean; onChanged: () => void };

// SprintBar sits under the board header: start a sprint, see time left, close it, browse history.
export function SprintBar({ board, token, canManage, editMode = false, onChanged }: Props) {
  const [starting, setStarting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [editingLength, setEditingLength] = useState(false);
  const sprint = board.sprint;
  const sprintStarted = sprint ? new Date(sprint.starts_at).getTime() <= Date.now() : false;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-6 py-3 text-sm">
      {sprint ? (
        <>
          <span className="font-semibold">Sprint {sprint.number}</span>
          <span className="text-muted-foreground">
            {day.format(new Date(sprint.starts_at))} – {day.format(new Date(sprint.ends_at))} · {sprint.length_days} days
          </span>
          {sprintStarted
            ? <Status endsAt={sprint.ends_at} />
            : <Badge variant="secondary">Scheduled · starts {day.format(new Date(sprint.starts_at))}</Badge>}
          {sprintStarted && sprintLocked(sprint.ends_at) && (
            <span role="note" className="text-muted-foreground">Scope locked: the sprint ends today, so new tickets go to the backlog.</span>
          )}
          {/* a board setting: only while editing the board, like its scale and style */}
          {canManage && editMode && <Button size="sm" variant="outline" onClick={() => setEditingLength(true)}>Change length</Button>}
          {/* closing is running the board, not configuring it: hidden while editing */}
          {canManage && !editMode && sprintStarted && <Button size="sm" variant="outline" onClick={() => setClosing(true)}>Close sprint</Button>}
        </>
      ) : (
        <>
          <span className="text-muted-foreground">No sprint running — tickets aren&apos;t time-boxed.</span>
          {canManage && !editMode && <Button size="sm" onClick={() => setStarting(true)}>Start sprint</Button>}
        </>
      )}
      {/* closing a sprint opens the next, so number > 1 means there's history; no sprint, nothing to chart */}
      {/* reporting is for running the board: hidden while editing */}
      {!editMode && sprint && sprintStarted && sprint.number > 1 && <PastSprints boardId={board.id} token={token} />}
      {!editMode && sprint && sprintStarted && <Charts boardId={board.id} token={token} />}
      {canManage && <StartDialog open={starting} onOpenChange={setStarting} boardId={board.id} token={token} onStarted={onChanged} />}
      {canManage && sprint && <ChangeLengthDialog key={sprint.id} open={editingLength} onOpenChange={setEditingLength} sprint={sprint} token={token} onChanged={onChanged} />}
      {canManage && sprint && sprintStarted && <CloseDialog key={sprint.id} open={closing} onOpenChange={setClosing} board={board} sprint={sprint} token={token} onClosed={onChanged} />}
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
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'Only organization admins and this board’s team leaders can manage sprints.' : 'Couldn’t start the sprint. Please try again.');
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
            <DialogDescription>Tickets already on this board join it. When it ends, unfinished tickets move to the next sprint, whose start date and length you choose when closing.</DialogDescription>
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

function ChangeLengthDialog({ open, onOpenChange, sprint, token, onChanged }: {
  open: boolean; onOpenChange: (o: boolean) => void; sprint: Sprint; token: string; onChanged: () => void;
}) {
  const [days, setDays] = useState(String(sprint.length_days));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const valid = Number.isInteger(Number(days)) && Number(days) >= 1 && Number(days) <= 365;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await sprints.updateLength(sprint.id, Number(days), token);
      onOpenChange(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'Only organization admins and this board’s team leaders can manage sprints.' : 'Couldn’t change the sprint length. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Change sprint {sprint.number} length</DialogTitle>
            <DialogDescription>The end date updates from the sprint’s original start date.</DialogDescription>
          </DialogHeader>
          <label className="grid gap-2 text-sm font-medium">
            Length in days
            <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !valid}>{saving ? 'Saving…' : 'Save length'}</Button>
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
  const [nextLength, setNextLength] = useState(String(sprint.length_days));
  const [nextStartDate, setNextStartDate] = useState(localDateInputValue());
  // the board's last column counts as "done"; everything else carries over
  const cols = board.columns ?? [];
  const doneCol = cols.at(-1);
  const total = cols.reduce((n, c) => n + c.tickets.length, 0);
  const done = doneCol?.tickets.length ?? 0;
  const carry = total - done;
  const validNextLength = Number.isInteger(Number(nextLength)) && Number(nextLength) >= 1 && Number(nextLength) <= 365;
  const validNextStartDate = nextStartDate >= localDateInputValue();

  async function close() {
    setSaving(true);
    setError('');
    try {
      const today = localDateInputValue();
      const nextStartsAt = nextStartDate > today
        ? new Date(`${nextStartDate}T00:00:00`).toISOString()
        : undefined;
      await sprints.close(sprint.id, token, { next_length_days: Number(nextLength), ...(nextStartsAt ? { next_starts_at: nextStartsAt } : {}) });
      onOpenChange(false);
      onClosed();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'Only organization admins and this board’s team leaders can manage sprints.' : 'Couldn’t close the sprint. Please try again.');
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
            Choose when the next sprint starts and how long it runs. {carry} unfinished ticket{carry === 1 ? '' : 's'} move
            {carry === 1 ? 's' : ''} into it, keeping their column; {done} in “{doneCol?.name ?? 'Done'}” stay with sprint {sprint.number}.
          </DialogDescription>
        </DialogHeader>
        <label className="grid gap-2 text-sm font-medium">
          Next sprint length in days
          <Input type="number" min={1} max={365} value={nextLength} onChange={(e) => setNextLength(e.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Start next sprint on
          <Input type="date" min={localDateInputValue()} value={nextStartDate} onChange={(e) => setNextStartDate(e.target.value)} />
        </label>
        <p className="text-sm text-muted-foreground">Choose today to start immediately, or a future date to schedule it.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={close} disabled={saving || !validNextLength || !validNextStartDate}>{saving ? 'Closing…' : 'Close sprint'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


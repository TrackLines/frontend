'use client';

import { useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError, sprints, type Board, type Sprint } from '@/lib/api';
import { LENGTH_PRESETS, dateInput, daysUntil, sprintLocked, sprintStatus } from './sprint-status';
import { Charts } from './velocity';
import { PastSprints } from './past-sprints';

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

type Props = { board: Board; token: string; canManage: boolean; editMode?: boolean; onChanged: () => void };

// SprintBar sits under the board header: start a sprint, see time left, close it, browse history.
export function SprintBar({ board, token, canManage, editMode = false, onChanged }: Props) {
  const [starting, setStarting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [editingLength, setEditingLength] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
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
          {sprint.goal && (
            <span className="min-w-0"><span className="text-muted-foreground">Goal:</span> <span className="font-medium">{sprint.goal}</span></span>
          )}
          {sprintStarted && sprintLocked(sprint.ends_at) && (
            <span role="note" className="text-muted-foreground">Scope locked: the sprint ends today, so new tickets go to the backlog.</span>
          )}
          {/* a board setting: only while editing the board, like its scale and style */}
          {canManage && editMode && <Button size="sm" variant="outline" onClick={() => setEditingLength(true)}>Change length</Button>}
          {canManage && editMode && <Button size="sm" variant="outline" onClick={() => setEditingGoal(true)}>{sprint.goal ? 'Edit goal' : 'Set goal'}</Button>}
          {/* closing is running the board, not configuring it: hidden while editing */}
          {canManage && !editMode && sprintStarted && <Button size="sm" variant="outline" onClick={() => setClosing(true)}>Close sprint</Button>}
        </>
      ) : (
        <>
          <span className="text-muted-foreground">No sprint running — tickets aren&apos;t time-boxed.</span>
          {canManage && !editMode && <Button size="sm" onClick={() => setStarting(true)}>Start sprint</Button>}
        </>
      )}
      {/* number > 1 means there's history; between sprints (closed by hand) there may be too */}
      {/* reporting is for running the board: hidden while editing */}
      {!editMode && (sprint ? sprintStarted && sprint.number > 1 : true) && <PastSprints boardId={board.id} token={token} />}
      {!editMode && sprint && sprintStarted && <Charts boardId={board.id} token={token} />}
      {canManage && <StartDialog open={starting} onOpenChange={setStarting} boardId={board.id} token={token} onStarted={onChanged} />}
      {canManage && sprint && <ChangeLengthDialog key={`length-${sprint.id}`} open={editingLength} onOpenChange={setEditingLength} sprint={sprint} token={token} onChanged={onChanged} />}
      {canManage && sprint && <GoalDialog key={`goal-${sprint.id}`} open={editingGoal} onOpenChange={setEditingGoal} sprint={sprint} token={token} onChanged={onChanged} />}
      {canManage && sprint && sprintStarted && <CloseDialog key={`close-${sprint.id}`} open={closing} onOpenChange={setClosing} board={board} sprint={sprint} token={token} onClosed={onChanged} />}
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
  // custom: the sprint ends on a chosen date; its length is the days from today to then
  const [endDate, setEndDate] = useState(() => dateInput(new Date(Date.now() + 10 * 864e5)));
  const [goal, setGoal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const days = choice === 'custom' ? daysUntil(endDate) : choice;
  const valid = Number.isInteger(days) && days >= 1 && days <= 365;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await sprints.start(boardId, days, token, goal.trim());
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
            <DialogDescription>Tickets waiting on this board join it, and so does a planned next sprint. If it runs out it closes itself and the next one starts with the same length; close it yourself to choose the next one’s length.</DialogDescription>
          </DialogHeader>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Length</legend>
            {LENGTH_PRESETS.map((p) => (
              <label key={p.days} className="flex items-center gap-2">
                <input type="radio" name="length" checked={choice === p.days} onChange={() => setChoice(p.days)} className="accent-primary" />
                {p.label}
              </label>
            ))}
            <label className="flex flex-wrap items-center gap-2">
              <input type="radio" name="length" checked={choice === 'custom'} onChange={() => setChoice('custom')} className="accent-primary" />
              Ends on
              <Input
                type="date" value={endDate} aria-label="Sprint end date"
                min={dateInput(new Date(Date.now() + 864e5))} max={dateInput(new Date(Date.now() + 365 * 864e5))}
                className="h-8 w-auto" onFocus={() => setChoice('custom')} onChange={(e) => { setChoice('custom'); setEndDate(e.target.value); }}
              />
              {choice === 'custom' && valid && <span className="text-muted-foreground">{days} day{days === 1 ? '' : 's'}</span>}
            </label>
          </fieldset>
          <GoalField value={goal} onChange={setGoal} />
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
  const start = new Date(sprint.starts_at);
  // set the length in days, or pick the end date; either way it's measured from the original start
  const [mode, setMode] = useState<'days' | 'date'>('days');
  const [days, setDays] = useState(String(sprint.length_days));
  const [endDate, setEndDate] = useState(() => dateInput(new Date(sprint.ends_at)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const length = mode === 'date' ? daysUntil(endDate, start) : Number(days);
  const valid = Number.isInteger(length) && length >= 1 && length <= 365;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await sprints.updateLength(sprint.id, length, token);
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
            <DialogDescription>Set it in days, or pick an end date — either way it’s measured from the sprint’s original start date.</DialogDescription>
          </DialogHeader>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Length</legend>
            <label className="flex flex-wrap items-center gap-2">
              <input type="radio" name="length-mode" checked={mode === 'days'} onChange={() => setMode('days')} className="accent-primary" />
              <Input
                type="number" min={1} max={365} value={days} aria-label="Length in days" className="h-8 w-24"
                onFocus={() => setMode('days')} onChange={(e) => { setMode('days'); setDays(e.target.value); }}
              />
              days
            </label>
            <label className="flex flex-wrap items-center gap-2">
              <input type="radio" name="length-mode" checked={mode === 'date'} onChange={() => setMode('date')} className="accent-primary" />
              Ends on
              <Input
                type="date" value={endDate} aria-label="Sprint end date" className="h-8 w-auto"
                min={dateInput(new Date(start.getTime() + 864e5))} max={dateInput(new Date(start.getTime() + 365 * 864e5))}
                onFocus={() => setMode('date')} onChange={(e) => { setMode('date'); setEndDate(e.target.value); }}
              />
              {mode === 'date' && valid && <span className="text-muted-foreground">{length} day{length === 1 ? '' : 's'}</span>}
            </label>
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
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
  // the board's last column counts as "done"; everything else waits for the next sprint
  const cols = board.columns ?? [];
  const doneCol = cols.at(-1);
  const total = cols.reduce((n, c) => n + c.tickets.length, 0);
  const done = doneCol?.tickets.length ?? 0;
  const carry = total - done;

  async function close() {
    setSaving(true);
    setError('');
    try {
      await sprints.close(sprint.id, token); // just closes: Start sprint picks the next one's length
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
          <DialogDescription>{closeSummary(sprint.number, carry, done, doneCol?.name ?? 'Done')}</DialogDescription>
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

// closeSummary: what closing a sprint by hand does. The next sprint doesn't start until someone
// starts it, so its length (or end date) can be chosen then.
export function closeSummary(number: number, carry: number, done: number, doneName: string): string {
  const s = (n: number) => (n === 1 ? '' : 's');
  return `${carry} unfinished ticket${s(carry)} stay${carry === 1 ? 's' : ''} on the board, and ${done} in “${doneName}” stay${done === 1 ? 's' : ''} with sprint ${number}. `
    + 'The next sprint doesn’t start until you start it, so you can choose how long it runs. A planned next sprint joins then.';
}

export const GOAL_MAX = 200; // backend: sprints.goal

// GoalField: the optional one-line sprint goal, shared by starting, editing and planning a sprint.
export function GoalField({ value, onChange }: { value: string; onChange: (goal: string) => void }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>Goal <span className="font-normal text-muted-foreground">(optional)</span></span>
      <Input value={value} maxLength={GOAL_MAX} placeholder="What should this sprint achieve?" onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function GoalDialog({ open, onOpenChange, sprint, token, onChanged }: {
  open: boolean; onOpenChange: (o: boolean) => void; sprint: Sprint; token: string; onChanged: () => void;
}) {
  const [goal, setGoal] = useState(sprint.goal ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await sprints.setGoal(sprint.id, goal.trim(), token);
      onOpenChange(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'Only organization admins and this board’s team leaders can manage sprints.' : 'Couldn’t save the goal. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Sprint {sprint.number} goal</DialogTitle>
            <DialogDescription>One line the team is working towards. It shows on the board and in standup.</DialogDescription>
          </DialogHeader>
          <GoalField value={goal} onChange={setGoal} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : goal.trim() ? 'Save goal' : 'Clear goal'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import type { I18n } from '@lingui/core';
import { msg, plural } from '@lingui/core/macro';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError, sprints, type Board, type Sprint } from '@/lib/api';
import { LENGTH_PRESETS, dateInput, daysUntil, sprintLocked, sprintStatus } from './sprint-status';
import { Charts } from './velocity';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EllipsisIcon } from 'lucide-react';
import { PastSprints } from './past-sprints';
import { ImportReview } from '../board/import-review';
import { dates } from '@/lib/i18n';

type Props = { board: Board; token: string; canManage: boolean; editMode?: boolean; onChanged: () => void };

// SprintBar sits under the board header: start a sprint, see time left, close it, browse history.
export function SprintBar({ board, token, canManage, editMode = false, onChanged }: Props) {
  const { t, i18n } = useLingui();
  const day = dates(i18n, { day: 'numeric', month: 'short' });
  const [starting, setStarting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [editingLength, setEditingLength] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const sprint = board.sprint;
  const ended = board.last_sprint_number; // the latest closed sprint, when none is running
  const next = (ended ?? 0) + 1;
  const sprintStarted = sprint ? new Date(sprint.starts_at).getTime() <= Date.now() : false;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-6 py-3 text-sm">
      {sprint ? (
        <>
          <span className="font-semibold"><Trans>Sprint {sprint.number}</Trans></span>
          <span className="text-muted-foreground">
            {day.format(new Date(sprint.starts_at))} – {day.format(new Date(sprint.ends_at))} · <Plural value={sprint.length_days} one="# day" other="# days" />
          </span>
          {sprintStarted
            ? <Status endsAt={sprint.ends_at} />
            : <Badge variant="secondary"><Trans>Scheduled · starts {day.format(new Date(sprint.starts_at))}</Trans></Badge>}
          {sprint.goal && (
            <span className="min-w-0"><span className="text-muted-foreground"><Trans>Goal:</Trans></span> <span className="font-medium">{sprint.goal}</span></span>
          )}
          {sprintStarted && sprintLocked(sprint.ends_at) && (
            <span role="note" className="text-muted-foreground"><Trans>Scope locked: the sprint ends today, so new tickets go to the backlog.</Trans></span>
          )}
          {/* a board setting: only while editing the board, like its scale and style */}
          {canManage && editMode && <Button size="sm" variant="outline" onClick={() => setEditingLength(true)}><Trans>Change length</Trans></Button>}
          {canManage && editMode && <Button size="sm" variant="outline" onClick={() => setEditingGoal(true)}>{sprint.goal ? t`Edit goal` : t`Set goal`}</Button>}
          {/* closing is running the board, not configuring it: hidden while editing */}
          {canManage && !editMode && sprintStarted && <Button size="sm" variant="outline" className="max-md:hidden" onClick={() => setClosing(true)}><Trans>Close sprint</Trans></Button>}
          {/* phones (TL-695): behind a menu, not the first thing under your thumb; it still asks first */}
          {canManage && !editMode && sprintStarted && (
            <span className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="sm" variant="ghost" aria-label={t`Sprint actions`} />}><EllipsisIcon aria-hidden /></DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setClosing(true)}><Trans>Close sprint…</Trans></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          )}
        </>
      ) : (
        <>
          {/* between sprints (the board waits, TL-279, or one was closed by hand): say which ended */}
          {ended
            ? <span data-sprint-ended><span className="font-semibold"><Trans>Sprint {ended} ended</Trans></span>{' '}<span className="text-muted-foreground"><Trans>Unfinished tickets wait on the board until the next sprint starts.</Trans></span></span>
            : <span className="text-muted-foreground"><Trans>No sprint running — tickets aren&apos;t time-boxed.</Trans></span>}
          {/* an imported board settles its set-aside tickets first (TL-545) */}
          {canManage && !editMode && <Button size="sm" disabled={(board.to_review ?? 0) > 0} title={(board.to_review ?? 0) > 0 ? t`Review the imported tickets first` : undefined}
            onClick={() => setStarting(true)}>{ended ? t`Start sprint ${next}` : t`Start sprint`}</Button>}
          {!editMode && <ImportReview board={board} token={token} canManage={canManage} onChanged={onChanged} />}
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
  const { i18n } = useLingui();
  const { label, overdue } = sprintStatus(endsAt, i18n);
  return <Badge variant={overdue ? 'destructive' : 'secondary'}>{label}</Badge>;
}

function StartDialog({ open, onOpenChange, boardId, token, onStarted }: {
  open: boolean; onOpenChange: (o: boolean) => void; boardId: string; token: string; onStarted: () => void;
}) {
  const { t, i18n } = useLingui();
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
      setError(err instanceof ApiError && err.status === 403 ? t`Only organization admins and this board’s team leaders can manage sprints.` : t`Couldn’t start the sprint. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle><Trans>Start a sprint</Trans></DialogTitle>
            <DialogDescription><Trans>Tickets waiting on this board join it, and so does a planned next sprint. If it runs out it closes itself and the next one starts with the same length; close it yourself to choose the next one’s length.</Trans></DialogDescription>
          </DialogHeader>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium"><Trans>Length</Trans></legend>
            {LENGTH_PRESETS.map((p) => (
              <label key={p.days} className="flex items-center gap-2">
                <input type="radio" name="length" checked={choice === p.days} onChange={() => setChoice(p.days)} className="accent-primary" />
                {i18n._(p.label)}
              </label>
            ))}
            <label className="flex flex-wrap items-center gap-2">
              <input type="radio" name="length" checked={choice === 'custom'} onChange={() => setChoice('custom')} className="accent-primary" />
              <Trans>Ends on</Trans>
              <Input
                type="date" value={endDate} aria-label={t`Sprint end date`}
                min={dateInput(new Date(Date.now() + 864e5))} max={dateInput(new Date(Date.now() + 365 * 864e5))}
                className="h-8 w-auto" onFocus={() => setChoice('custom')} onChange={(e) => { setChoice('custom'); setEndDate(e.target.value); }}
              />
              {choice === 'custom' && valid && <span className="text-muted-foreground"><Plural value={days} one="# day" other="# days" /></span>}
            </label>
          </fieldset>
          <GoalField value={goal} onChange={setGoal} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving || !valid}>{saving ? t`Starting…` : valid ? t`Start ${days}-day sprint` : t`Start sprint`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangeLengthDialog({ open, onOpenChange, sprint, token, onChanged }: {
  open: boolean; onOpenChange: (o: boolean) => void; sprint: Sprint; token: string; onChanged: () => void;
}) {
  const { t } = useLingui();
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
      setError(err instanceof ApiError && err.status === 403 ? t`Only organization admins and this board’s team leaders can manage sprints.` : t`Couldn’t change the sprint length. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle><Trans>Change sprint {sprint.number} length</Trans></DialogTitle>
            <DialogDescription><Trans>Set it in days, or pick an end date — either way it’s measured from the sprint’s original start date.</Trans></DialogDescription>
          </DialogHeader>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium"><Trans>Length</Trans></legend>
            <label className="flex flex-wrap items-center gap-2">
              <input type="radio" name="length-mode" checked={mode === 'days'} onChange={() => setMode('days')} className="accent-primary" />
              <Input
                type="number" min={1} max={365} value={days} aria-label={t`Length in days`} className="h-8 w-24"
                onFocus={() => setMode('days')} onChange={(e) => { setMode('days'); setDays(e.target.value); }}
              />
              <Trans>days</Trans>
            </label>
            <label className="flex flex-wrap items-center gap-2">
              <input type="radio" name="length-mode" checked={mode === 'date'} onChange={() => setMode('date')} className="accent-primary" />
              <Trans>Ends on</Trans>
              <Input
                type="date" value={endDate} aria-label={t`Sprint end date`} className="h-8 w-auto"
                min={dateInput(new Date(start.getTime() + 864e5))} max={dateInput(new Date(start.getTime() + 365 * 864e5))}
                onFocus={() => setMode('date')} onChange={(e) => { setMode('date'); setEndDate(e.target.value); }}
              />
              {mode === 'date' && valid && <span className="text-muted-foreground"><Plural value={length} one="# day" other="# days" /></span>}
            </label>
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}><Trans>Cancel</Trans></DialogClose>
            <Button type="submit" disabled={saving || !valid}>{saving ? t`Saving…` : t`Save length`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({ open, onOpenChange, board, sprint, token, onClosed }: {
  open: boolean; onOpenChange: (o: boolean) => void; board: Board; sprint: Sprint; token: string; onClosed: () => void;
}) {
  const { t, i18n } = useLingui();
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
      setError(err instanceof ApiError && err.status === 403 ? t`Only organization admins and this board’s team leaders can manage sprints.` : t`Couldn’t close the sprint. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle><Trans>Close sprint {sprint.number}?</Trans></DialogTitle>
          <DialogDescription><Trans>Closing it now:</Trans></DialogDescription>
        </DialogHeader>
        <ul className="grid gap-1.5 text-sm">
          {closeSummary(sprint.number, carry, done, doneCol?.name ?? t`Done`, i18n).map((line) => (
            <li key={line.count + line.text} className="flex items-baseline gap-2">
              <span className="min-w-6 text-right font-semibold tabular-nums">{line.count}</span>
              <span>{line.text}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">{i18n._(CLOSE_NEXT)}</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}><Trans>Cancel</Trans></Button>
          <Button onClick={close} disabled={saving}>{saving ? t`Closing…` : t`Close sprint`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// closeSummary: where a sprint's tickets go when it's closed by hand, one line each.
export function closeSummary(number: number, carry: number, done: number, doneName: string, i18n: I18n): { count: number; text: string }[] {
  return [
    { count: carry, text: i18n._(msg`${plural(carry, { one: 'unfinished ticket stays on the board', other: 'unfinished tickets stay on the board' })}`) },
    { count: done, text: i18n._(msg`${plural(done, { one: `in “${doneName}” stays with sprint ${number}`, other: `in “${doneName}” stay with sprint ${number}` })}`) },
  ];
}

// the next sprint doesn't start until someone starts it, so its length (or end date) can be chosen then
export const CLOSE_NEXT = msg`The next sprint won’t start until you start it, so you can choose its length then. A planned next sprint joins when it starts.`;

export const GOAL_MAX = 200; // backend: sprints.goal

// GoalField: the optional one-line sprint goal, shared by starting, editing and planning a sprint.
export function GoalField({ value, onChange }: { value: string; onChange: (goal: string) => void }) {
  const { t } = useLingui();
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span><Trans>Goal <span className="font-normal text-muted-foreground">(optional)</span></Trans></span>
      <Input value={value} maxLength={GOAL_MAX} placeholder={t`What should this sprint achieve?`} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function GoalDialog({ open, onOpenChange, sprint, token, onChanged }: {
  open: boolean; onOpenChange: (o: boolean) => void; sprint: Sprint; token: string; onChanged: () => void;
}) {
  const { t } = useLingui();
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
      setError(err instanceof ApiError && err.status === 403 ? t`Only organization admins and this board’s team leaders can manage sprints.` : t`Couldn’t save the goal. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle><Trans>Sprint {sprint.number} goal</Trans></DialogTitle>
            <DialogDescription><Trans>One line the team is working towards. It shows on the board and in standup.</Trans></DialogDescription>
          </DialogHeader>
          <GoalField value={goal} onChange={setGoal} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}><Trans>Cancel</Trans></Button>
            <Button type="submit" disabled={saving}>{saving ? t`Saving…` : goal.trim() ? t`Save goal` : t`Clear goal`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

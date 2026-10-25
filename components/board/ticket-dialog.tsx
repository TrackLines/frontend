'use client';

import type { I18n } from '@lingui/core';
import { msg, plural } from '@lingui/core/macro';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { MarkdownTextarea } from '@/components/markdown';
import { SimilarTickets, useSimilarTickets } from '@/components/ticket/similar-tickets';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssigneeSelect } from '@/components/ticket/assignee-select';
import { LabelDrawer } from '@/components/ticket/labels';
import { Attachments } from '@/components/ticket/attachments';
import { BugfixesPanel } from '@/components/ticket/bugfixes-panel';
import { PullRequestsPanel } from '@/components/ticket/pull-requests-panel';
import { attachAll, PendingAttachments, type PendingFile } from '@/components/ticket/pending-attachments';
import { TypePicker } from '@/components/ticket-type';
import { PrioritySelect } from './priority-select';
import { EstimateSelect } from './estimate';
import { DueDateField } from '@/components/ticket/due-date-field';
import { missingTicketFields } from './ticket-validation';
import { TicketKey } from '@/components/ticket/ticket-key';
import { MoveToBoard } from '@/components/project/move-to-board';
import type { EstimateScale } from '@/lib/estimates';
import type { Board, MovedTicket, Ticket, TicketType } from '@/lib/api';
import { ApiError, backlog, tickets } from '@/lib/api';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  projectId?: string;
  columnId: string; // '' creates into projectId's backlog
  ticket?: Ticket;
  onSaved: (ticket: Ticket) => void;
  onDeleted?: (id: string) => void;
  onSentToBacklog?: (id: string) => void; // ticket leaves the board for the project backlog
  onWontDo?: (id: string) => void; // backlog only: closed as won't do (it stays, with the reason)
  done?: boolean; // in the board's last column: attachments locked
  scale?: EstimateScale; // the board's; no estimate field when absent or 'none'
  epic?: boolean; // offer the Epic type; defaults to everywhere but creating on a board (epics live in the backlog)
  move?: { boards: Board[]; onMoved: (id: string, planned: boolean) => void }; // Move to board, from the backlog (TL-464) or another board (TL-381)
};

// alsoMovesNote: "Sending it to the backlog also moves 2 sub-tickets: TL-5, TL-6." (TL-218), or for a
// move to another board (TL-381) "Moving it also moves…", or ''.
export function alsoMovesNote(subs: MovedTicket[], i18n: I18n, to: 'backlog' | 'board' = 'backlog'): string {
  if (subs.length === 0) return '';
  const shown = subs.slice(0, 5).map((s) => s.key ?? s.title).join(', '), more = subs.length - 5;
  const names = more > 0 ? i18n._(msg`${shown} and ${more} more`) : shown;
  if (to === 'board') return i18n._(msg`${plural(subs.length, { one: `Moving it also moves its open sub-ticket on this board: ${names}.`, other: `Moving it also moves its # open sub-tickets on this board: ${names}.` })}`);
  return i18n._(msg`${plural(subs.length, { one: `Sending it to the backlog also moves its open sub-ticket on this board: ${names}.`, other: `Sending it to the backlog also moves its # open sub-tickets on this board: ${names}.` })}`);
}

// convertLeavesBoard: saving ticket as type takes it off its board: it's becoming an epic (TL-213).
export const convertLeavesBoard = (ticket: { type?: TicketType; column_id?: string | null } | undefined, type: TicketType) =>
  Boolean(ticket && type === 'epic' && ticket.type !== 'epic' && ticket.column_id);

// TICKET_DIALOG_WIDTH: ticket dialogs get room to work, 2/3 of the screen (phones: full width).
// Every ticket dialog uses it (create, edit and the read-only view), so they look the same.
export const TICKET_DIALOG_WIDTH = 'sm:max-w-[66vw]';

export function TicketDialog({ open, onOpenChange, token, projectId, columnId, ticket, onSaved, onDeleted, onSentToBacklog, onWontDo, done, scale = 'none', epic, move }: Props) {
  const { t, i18n } = useLingui();
  const [title, setTitle] = useState(ticket?.title ?? '');
  const [description, setDescription] = useState(ticket?.description ?? '');
  const [type, setType] = useState<TicketType>(ticket?.type ?? 'task');
  const [priority, setPriority] = useState<string>(ticket?.priority ?? '');
  const [labels, setLabels] = useState<string[]>(ticket?.labels ?? []);
  const [estimate, setEstimate] = useState(ticket?.estimate ?? '');
  const [timeboxDays, setTimeboxDays] = useState(ticket?.timebox_days ?? 0); // spike timebox (TL-502)
  const [timeboxHours, setTimeboxHours] = useState(ticket?.timebox_hours ?? 0);
  const [dueDate, setDueDate] = useState(ticket?.due_date ?? ''); // TL-632; "" = none
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moving, setMoving] = useState(false);
  const [wontDo, setWontDo] = useState<string | null>(null); // the reason, while confirming won't do
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<{ title: boolean; estimate: boolean }>({ title: false, estimate: false });
  const titleInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PendingFile[]>([]); // create mode only
  const editing = Boolean(ticket);
  // the board has a scale, so an estimate is required; epics take none (their sub-tickets are sized)
  const estimating = scale !== 'none' && type !== 'epic';
  const offerEpic = epic ?? (editing || !columnId);
  // making a board ticket an epic takes it off the board (TL-213)
  const leavesBoard = convertLeavesBoard(ticket, type);

  useEffect(() => {
    if (open) {
      setTitle(ticket?.title ?? '');
      setDescription(ticket?.description ?? '');
      setType(ticket?.type ?? 'task');
      setPriority(ticket?.priority ?? '');
      setLabels(ticket?.labels ?? []);
      setEstimate(ticket?.estimate ?? '');
      setTimeboxDays(ticket?.timebox_days ?? 0);
      setTimeboxHours(ticket?.timebox_hours ?? 0);
      setDueDate(ticket?.due_date ?? '');
      setConfirmDelete(false);
      setMoving(false);
      setWontDo(null);
      setError('');
      setMissing({ title: false, estimate: false });
    }
    // only on opening (or another ticket): a background refresh hands us a fresh copy of the same
    // ticket every 30s, and resetting then wiped whatever was being typed (TL-141)
  }, [open, ticket?.id]);

  const duplicateSuggestions = useSimilarTickets(title, projectId, token, open && !ticket);
  // what would go with it to the backlog: its open sub-tickets on this board (TL-218)
  const [subs, setSubs] = useState<MovedTicket[]>([]);
  useEffect(() => {
    setSubs([]);
    if (open && ticket?.column_id && onSentToBacklog) tickets.group(ticket.id, token).then(setSubs, () => setSubs([]));
  }, [open, ticket?.id]);

  async function closeWontDo() {
    if (!ticket || !onWontDo || wontDo === null) return;
    setSaving(true);
    setError('');
    try {
      await tickets.resolve(ticket.id, token, 'wont_do', wontDo);
      onWontDo(ticket.id);
      onOpenChange(false);
    } catch {
      setError(t`Could not close this ticket. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const nextMissing = missingTicketFields(cleanTitle, estimate, estimating);
    setMissing(nextMissing);
    if (nextMissing.title || nextMissing.estimate) {
      setError(t`Complete the highlighted required fields before adding this ticket.`);
      if (nextMissing.title) titleInput.current?.focus();
      else document.getElementById('ticket-estimate')?.focus();
      return;
    }
    setSaving(true);
    setError('');
    try {
      // a spike's timebox (TL-502); other types don't carry one, so clear it (0/0) if the type changed away
      const timebox = type === 'spike' ? { timebox_days: timeboxDays, timebox_hours: timeboxHours } : { timebox_days: 0, timebox_hours: 0 };
      if (ticket) {
        await tickets.update(ticket.id, { title: cleanTitle, description: description.trim(), type, priority, ...(estimating && { estimate }), ...timebox, due_date: dueDate }, token);
        const result = await tickets.setLabels(ticket.id, labels, token);
        if (leavesBoard && onSentToBacklog) onSentToBacklog(ticket.id); // now an epic, in the backlog
        else onSaved({ ...ticket, title: cleanTitle, description: description.trim(), type, priority, labels: result.labels, ...(estimating && { estimate: estimate || null }), ...(type === 'epic' && { estimate: null }), timebox_days: type === 'spike' ? timeboxDays || null : null, timebox_hours: type === 'spike' ? timeboxHours || null : null, due_date: dueDate || null });
      } else {
        const input = { title: cleanTitle, description: description.trim(), type, priority, labels, ...(estimating && estimate && columnId && { estimate }), ...(type === 'spike' && { timebox_days: timeboxDays, timebox_hours: timeboxHours }), ...(dueDate && { due_date: dueDate }) };
        const created = columnId ? await tickets.create(columnId, input, token) : (await backlog.create(projectId ?? '', input, token)) as unknown as Ticket;
        await attachAll(created.id, files, token); // failures are visible on the ticket's attachment list
        setFiles([]);
        onSaved(created);
      }
      onOpenChange(false);
    } catch (err) {
      // 400/409 say why, e.g. an epic can't go inside another epic
      setError(err instanceof ApiError && (err.status === 400 || err.status === 409) ? err.message : t`Could not save this ticket. Check your connection and try again.`);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!ticket || !onDeleted) return;
    setDeleting(true);
    setError('');
    try {
      await tickets.remove(ticket.id, token);
      onDeleted(ticket.id);
      onOpenChange(false);
    } catch {
      setError(t`Could not delete this ticket. Try again.`);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function toBacklog() {
    if (!ticket || !onSentToBacklog) return;
    setSaving(true);
    setError('');
    try {
      const res = await backlog.send(ticket.id, token);
      onSentToBacklog(ticket.id);
      for (const sub of res?.also_moved ?? []) onSentToBacklog(sub.id); // they left the board too
      onOpenChange(false);
    } catch (err) {
      // 400/409 say why, e.g. which sub-ticket can't go with it
      setError(err instanceof ApiError && (err.status === 400 || err.status === 409) ? err.message : t`Could not move this ticket to the backlog. Try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* default shadcn width (sm:max-w-sm) is too narrow for this form + 4 footer actions */}
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${TICKET_DIALOG_WIDTH}`}>
        <DialogHeader>
          <DialogTitle>{editing ? t`Edit ticket` : t`Add a ticket`}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2"><TicketKey value={ticket?.key} copy /><Trans>Give the work a clear title. Details are optional.</Trans></DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium">
            <Trans>Title</Trans>
            <Input ref={titleInput} autoFocus value={title} maxLength={200} aria-required="true" aria-invalid={missing.title || undefined} aria-describedby={missing.title ? 'ticket-title-error' : undefined} placeholder={t`What needs to be done?`} onChange={(event) => { setTitle(event.target.value); if (event.target.value.trim()) setMissing((current) => ({ ...current, title: false })); }} />
            {missing.title && <span id="ticket-title-error" className="text-xs font-normal text-destructive"><Trans>Enter a title.</Trans></span>}
          </label>
          <SimilarTickets suggestions={duplicateSuggestions} description={description} />
          <label className="grid gap-1.5 text-sm font-medium">
            <span><Trans>Details <span className="font-normal text-muted-foreground">(optional, Markdown supported)</span></Trans></span>
            <MarkdownTextarea
              value={description}
              mentions={token}
              maxLength={10000}
              rows={5}
              placeholder={t`Add useful context or acceptance notes.`}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          {/* the short pickers share a row (the dialog is wide); they stack on phones */}
          <div className="grid gap-4 sm:grid-cols-3">
            <TypePicker value={type} onChange={setType} epic={offerEpic} />
            <label className="grid gap-1.5 text-sm font-medium">
              <span><Trans>Priority <span className="font-normal text-muted-foreground">(optional)</span></Trans></span>
              <PrioritySelect value={priority} onChange={setPriority} />
            </label>
            {estimating && (
              <label className="grid gap-1.5 text-sm font-medium">
                <Trans>Estimate</Trans>
                <EstimateSelect scale={scale} value={estimate} onChange={(value) => { setEstimate(value); if (value) setMissing((current) => ({ ...current, estimate: false })); }} required invalid={missing.estimate} describedBy={missing.estimate ? 'ticket-estimate-error' : undefined} />
                {missing.estimate && <span id="ticket-estimate-error" className="text-xs font-normal text-destructive"><Trans>Choose an estimate.</Trans></span>}
              </label>
            )}
            <DueDateField value={dueDate} onChange={setDueDate} />
          </div>
          {type === 'spike' && (
            <fieldset className="grid gap-1.5 text-sm font-medium">
              <legend><Trans>Timebox <span className="font-normal text-muted-foreground">(optional)</span></Trans></legend>
              <div className="grid max-w-sm grid-cols-2 gap-3">
                <label className="grid gap-1 font-normal text-muted-foreground">
                  <Trans>Days</Trans>
                  <Select items={Object.fromEntries(Array.from({ length: 61 }, (_, days) => [String(days), i18n._(msg`${plural(days, { one: '# day', other: '# days' })}`)]))} value={String(timeboxDays)} onValueChange={(value) => { if (value) setTimeboxDays(Number(value)); }}>
                    <SelectTrigger aria-label={t`Timebox days`} className="w-full text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 61 }, (_, days) => (
                        <SelectItem key={days} value={String(days)}><Plural value={days} one="# day" other="# days" /></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="grid gap-1 font-normal text-muted-foreground">
                  <Trans>Hours</Trans>
                  <Select items={Object.fromEntries(Array.from({ length: 24 }, (_, hours) => [String(hours), i18n._(msg`${plural(hours, { one: '# hour', other: '# hours' })}`)]))} value={String(timeboxHours)} onValueChange={(value) => { if (value) setTimeboxHours(Number(value)); }}>
                    <SelectTrigger aria-label={t`Timebox hours`} className="w-full text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, hours) => (
                        <SelectItem key={hours} value={String(hours)}><Plural value={hours} one="# hour" other="# hours" /></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </fieldset>
          )}
          {leavesBoard && (
            <p role="note" className="rounded-lg border border-violet-500/40 bg-violet-500/5 p-3 text-sm">
              <Trans>Making it an epic moves it to the backlog and clears its estimate. Its sub-tickets stay where they are.</Trans>
            </p>
          )}
          <LabelDrawer projectId={projectId ?? ticket?.project_id ?? ''} token={token} labels={labels} onChange={setLabels} disabled={saving || deleting} />
          {ticket && (
            // saves straight away (not with the form) — same as claiming
            <label className="grid gap-1.5 text-sm font-medium">
              <Trans>Assignee</Trans>
              <AssigneeSelect ticketId={ticket.id} value={ticket.assigned_to} token={token} onChange={(next) => onSaved({ ...ticket, assigned_to: next.assigned_to })} />
            </label>
          )}
          {ticket && <BugfixesPanel ticket={ticket} token={token} />}
          {ticket ? <Attachments ticketId={ticket.id} token={token} locked={done} /> : <PendingAttachments files={files} onChange={setFiles} projectId={projectId ?? ''} />}
          {ticket && <PullRequestsPanel ticketId={ticket.id} token={token} />}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {confirmDelete && (
            <div role="alert" className="grid gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p><Trans>Delete this ticket? It’s kept for 30 days in case it was a mistake (contact us to get it back), then permanently deleted with its comments and files.</Trans></p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="destructive" disabled={deleting} onClick={remove}>{deleting ? t`Deleting…` : t`Delete ticket`}</Button>
                <Button type="button" size="sm" variant="outline" disabled={deleting} onClick={() => setConfirmDelete(false)}><Trans>Keep ticket</Trans></Button>
              </div>
            </div>
          )}
          {moving && ticket && move && (
            <MoveToBoard ticket={ticket} boards={move.boards} token={token} onCancel={() => setMoving(false)} fromBoard={!!columnId} alsoMoves={alsoMovesNote(subs, i18n, 'board')}
              onMoved={(planned) => { move.onMoved(ticket.id, planned); onOpenChange(false); }} />
          )}
          {wontDo !== null && (
            <div role="alert" className="grid gap-2 rounded-lg border p-3 text-sm">
              <p><Trans>Close this ticket as <strong>won&apos;t do</strong>? It leaves the backlog but is kept, so whoever raised it can be told.</Trans></p>
              <label className="grid gap-1.5 font-medium">
                <span><Trans>Reason <span className="font-normal text-muted-foreground">(optional, added as a comment)</span></Trans></span>
                <MarkdownTextarea mentions={token} value={wontDo} maxLength={10000} rows={2} onChange={(e) => setWontDo(e.target.value)} />
              </label>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={saving} onClick={closeWontDo}>{saving ? t`Closing…` : t`Close as won’t do`}</Button>
                <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => setWontDo(null)}><Trans>Keep it open</Trans></Button>
              </div>
            </div>
          )}
          {editing && onSentToBacklog && subs.length > 0 && !confirmDelete && wontDo === null && (
            <p role="note" className="text-xs text-muted-foreground">{alsoMovesNote(subs, i18n)}</p>
          )}
          <DialogFooter className="sm:flex-wrap">
            {editing && !confirmDelete && wontDo === null && !moving && (
              <div className="flex gap-2 sm:mr-auto">
                {onDeleted && <Button type="button" variant="destructive" disabled={saving} onClick={() => setConfirmDelete(true)}><Trans>Delete</Trans></Button>}
                {onWontDo && <Button type="button" variant="outline" disabled={saving} onClick={() => setWontDo('')}><Trans>Won&apos;t do</Trans></Button>}
                {onSentToBacklog && <Button type="button" variant="ghost" disabled={saving} onClick={toBacklog}><Trans>Send to backlog</Trans></Button>}
                {move && move.boards.length > 0 && <Button type="button" variant="outline" disabled={saving} onClick={() => setMoving(true)}><Trans>Move to board…</Trans></Button>}
              </div>
            )}
            <Button type="button" variant="outline" disabled={saving || deleting} onClick={() => onOpenChange(false)}><Trans>Cancel</Trans></Button>
            <Button type="submit" disabled={saving || deleting}>{saving ? t`Saving…` : editing ? t`Save changes` : t`Add ticket`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

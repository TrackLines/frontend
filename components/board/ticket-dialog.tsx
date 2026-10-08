'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AssigneeSelect } from '@/components/ticket/assignee-select';
import { LabelDrawer } from '@/components/ticket/labels';
import { Attachments } from '@/components/ticket/attachments';
import { attachAll, PendingAttachments, type PendingFile } from '@/components/ticket/pending-attachments';
import { TypePicker } from '@/components/ticket-type';
import { PrioritySelect } from './priority-select';
import type { Ticket, TicketType } from '@/lib/api';
import { backlog, tickets } from '@/lib/api';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  projectId?: string;
  columnId: string;
  ticket?: Ticket;
  onSaved: (ticket: Ticket) => void;
  onDeleted?: (id: string) => void;
  onSentToBacklog?: (id: string) => void; // ticket leaves the board for the project backlog
  done?: boolean; // in the board's last column: attachments locked
};

export function TicketDialog({ open, onOpenChange, token, projectId, columnId, ticket, onSaved, onDeleted, onSentToBacklog, done }: Props) {
  const [title, setTitle] = useState(ticket?.title ?? '');
  const [description, setDescription] = useState(ticket?.description ?? '');
  const [type, setType] = useState<TicketType>(ticket?.type ?? 'task');
  const [priority, setPriority] = useState<string>(ticket?.priority ?? '');
  const [labels, setLabels] = useState<string[]>(ticket?.labels ?? []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]); // create mode only
  const editing = Boolean(ticket);

  useEffect(() => {
    if (open) {
      setTitle(ticket?.title ?? '');
      setDescription(ticket?.description ?? '');
      setType(ticket?.type ?? 'task');
      setPriority(ticket?.priority ?? '');
      setLabels(ticket?.labels ?? []);
      setConfirmDelete(false);
      setError('');
    }
  }, [open, ticket]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setSaving(true);
    setError('');
    try {
      if (ticket) {
        await tickets.update(ticket.id, { title: cleanTitle, description: description.trim(), type, priority }, token);
        const result = await tickets.setLabels(ticket.id, labels, token);
        onSaved({ ...ticket, title: cleanTitle, description: description.trim(), type, priority, labels: result.labels });
      } else {
        const created = await tickets.create(columnId, { title: cleanTitle, description: description.trim(), type, priority, labels }, token);
        await attachAll(created.id, files, token); // failures are visible on the ticket's attachment list
        setFiles([]);
        onSaved(created);
      }
      onOpenChange(false);
    } catch {
      setError('Could not save this ticket. Check your connection and try again.');
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
      setError('Could not delete this ticket. Try again.');
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
      await backlog.send(ticket.id, token);
      onSentToBacklog(ticket.id);
      onOpenChange(false);
    } catch {
      setError('Could not move this ticket to the backlog. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* default shadcn width (sm:max-w-sm) is too narrow for this form + 4 footer actions */}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit ticket' : 'Add a ticket'}</DialogTitle>
          <DialogDescription>Give the work a clear title. Details are optional.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4">
          <TypePicker value={type} onChange={setType} name={`type-${ticket?.id ?? 'new'}`} />
          <label className="grid gap-1.5 text-sm font-medium">
            Title
            <Input autoFocus value={title} maxLength={200} required placeholder="What needs to be done?" onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Details <span className="font-normal text-muted-foreground">(optional)</span>
            <textarea
              value={description}
              maxLength={10000}
              rows={5}
              placeholder="Add useful context or acceptance notes."
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Priority <span className="font-normal text-muted-foreground">(optional)</span>
            <PrioritySelect value={priority} onChange={setPriority} />
          </label>
          <LabelDrawer projectId={projectId ?? ticket?.project_id ?? ''} token={token} labels={labels} onChange={setLabels} disabled={saving || deleting} />
          {ticket && (
            // saves straight away (not with the form) — same as claiming
            <label className="grid gap-1.5 text-sm font-medium">
              Assignee
              <AssigneeSelect ticketId={ticket.id} value={ticket.assigned_to} token={token} onChange={(t) => onSaved({ ...ticket, assigned_to: t.assigned_to })} />
            </label>
          )}
          {ticket ? <Attachments ticketId={ticket.id} token={token} locked={done} /> : <PendingAttachments files={files} onChange={setFiles} />}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {confirmDelete && (
            <div role="alert" className="grid gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p>Delete this ticket? This cannot be undone.</p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="destructive" disabled={deleting} onClick={remove}>{deleting ? 'Deleting…' : 'Delete ticket'}</Button>
                <Button type="button" size="sm" variant="outline" disabled={deleting} onClick={() => setConfirmDelete(false)}>Keep ticket</Button>
              </div>
            </div>
          )}
          <DialogFooter className="sm:flex-wrap">
            {editing && !confirmDelete && (
              <div className="flex gap-2 sm:mr-auto">
                {onDeleted && <Button type="button" variant="destructive" disabled={saving} onClick={() => setConfirmDelete(true)}>Delete</Button>}
                {onSentToBacklog && <Button type="button" variant="ghost" disabled={saving} onClick={toBacklog}>Send to backlog</Button>}
              </div>
            )}
            <Button type="button" variant="outline" disabled={saving || deleting} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || deleting || !title.trim()}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add ticket'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

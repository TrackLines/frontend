'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Ticket } from '@/lib/api';
import { tickets } from '@/lib/api';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  columnId: string;
  ticket?: Ticket;
  onSaved: (ticket: Ticket) => void;
  onDeleted?: (id: string) => void;
};

export function TicketDialog({ open, onOpenChange, token, columnId, ticket, onSaved, onDeleted }: Props) {
  const [title, setTitle] = useState(ticket?.title ?? '');
  const [description, setDescription] = useState(ticket?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const editing = Boolean(ticket);

  useEffect(() => {
    if (open) {
      setTitle(ticket?.title ?? '');
      setDescription(ticket?.description ?? '');
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
        await tickets.update(ticket.id, { title: cleanTitle, description: description.trim() }, token);
        onSaved({ ...ticket, title: cleanTitle, description: description.trim() });
      } else {
        const created = await tickets.create(columnId, { title: cleanTitle, description: description.trim() }, token);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit ticket' : 'Add a ticket'}</DialogTitle>
          <DialogDescription>Give the work a clear title. Details are optional.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4">
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
          <DialogFooter>
            {editing && onDeleted && !confirmDelete && (
              <Button type="button" variant="destructive" className="sm:mr-auto" disabled={saving} onClick={() => setConfirmDelete(true)}>Delete</Button>
            )}
            <Button type="button" variant="outline" disabled={saving || deleting} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || deleting || !title.trim()}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add ticket'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

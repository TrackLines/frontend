'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Column as BoardColumn } from '@/lib/api';
import { columns } from '@/lib/api';

type ColumnProps = {
  column: BoardColumn;
  token: string;
  editMode?: boolean;
  children?: ReactNode;
};

export function Column({ column, token, editMode = false, children }: ColumnProps) {
  const [name, setName] = useState(column.name);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(column.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = draft.trim();
    if (!nextName || nextName === name) {
      setDraft(name);
      setEditing(false);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await columns.rename(column.id, nextName, token);
      setName(nextName);
      setDraft(nextName);
      setEditing(false);
    } catch {
      setError('Could not rename this column. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label={`${name} column`} data-column-id={column.id} className="flex min-h-48 min-w-0 w-full flex-col gap-3 rounded-xl bg-muted/50 p-3">
      <header className="flex min-h-8 items-center justify-between gap-2">
        {editing && editMode ? (
          <form onSubmit={saveName} className="flex min-w-0 flex-1 gap-2">
            <label className="sr-only" htmlFor={`column-name-${column.id}`}>Column name</label>
            <Input id={`column-name-${column.id}`} autoFocus value={draft} maxLength={80} required onChange={(event) => setDraft(event.target.value)} />
            <Button type="submit" size="sm" disabled={saving || !draft.trim()}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => { setDraft(name); setEditing(false); setError(''); }}>Cancel</Button>
          </form>
        ) : (
          <>
            <h2 className="min-w-0 truncate font-semibold">{name}</h2>
            {editMode && <Button type="button" variant="ghost" size="sm" onClick={() => { setDraft(name); setEditing(true); setError(''); }}>Rename</Button>}
          </>
        )}
      </header>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="grid content-start gap-3">{children}</div>
    </section>
  );
}

type AddColumnProps = {
  boardId: string;
  token: string;
  onCreated: (column: Omit<BoardColumn, 'tickets'>) => void;
};

export function AddColumn({ boardId, token, onCreated }: AddColumnProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) return;
    setSaving(true);
    setError('');
    try {
      const column = await columns.create(boardId, nextName, token);
      onCreated(column);
      setName('');
      setOpen(false);
    } catch {
      setError('Could not add this column. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-72 shrink-0">
      {!open ? (
        <Button type="button" variant="outline" className="w-full justify-start" onClick={() => { setOpen(true); setError(''); }}>Add column</Button>
      ) : (
        <form onSubmit={create} className="grid gap-2 rounded-xl border bg-background p-3">
          <label className="grid gap-1.5 text-sm font-medium" htmlFor="new-column-name">New column name</label>
          <Input id="new-column-name" autoFocus value={name} maxLength={80} required placeholder="e.g. Review" onChange={(event) => setName(event.target.value)} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving || !name.trim()}>{saving ? 'Adding…' : 'Add column'}</Button>
            <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => { setOpen(false); setName(''); setError(''); }}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

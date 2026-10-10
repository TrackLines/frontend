'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { EditableTitle } from '@/components/editable-title';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, type Column as BoardColumn } from '@/lib/api';
import { columns } from '@/lib/api';
import { points, type EstimateScale } from '@/lib/estimates';

type ColumnProps = {
  column: BoardColumn;
  token: string;
  editMode?: boolean;
  note?: ReactNode; // under the header, e.g. kanban's hidden Done tickets
  scale?: EstimateScale; // the board's: with one, the header also shows the column's points
  done?: boolean; // the board's last column: its points are completed, the others' still to do
  children?: ReactNode;
};

export function Column({ column, token, editMode = false, note, scale = 'none', done = false, children }: ColumnProps) {
  const [name, setName] = useState(column.name);
  const [limit, setLimit] = useState(column.wip_limit ?? null);
  const count = column.tickets.length;
  const over = limit !== null && count > limit;
  const total = column.tickets.reduce((sum, t) => sum + points(t.estimate), 0);

  return (
    <section
      aria-label={`${name} column`} data-column-id={column.id}
      className={`flex min-h-48 min-w-0 w-full flex-col gap-3 rounded-xl bg-muted/50 p-3 ${over ? 'ring-2 ring-destructive/50' : ''}`}
    >
      <header className="flex min-h-8 items-center justify-between gap-2">
        <EditableTitle
          value={name} label="column" as="h2" editable={editMode} className="font-semibold" maxLength={80}
          onSave={async (next) => {
            try { await columns.update(column.id, { name: next }, token); }
            catch (err) { if (err instanceof ApiError && err.status === 403) throw new Error('Only organization admins and this board’s team leaders can edit columns.'); throw err; }
            setName(next);
          }}
        />
        <div className="flex items-center gap-1.5">
          {scale !== 'none' && (
            <Badge variant="outline" title={done ? 'Points completed' : 'Points left to do'}>
              {total} {total === 1 ? 'pt' : 'pts'} {done ? 'done' : 'left'}
            </Badge>
          )}
          <Badge variant={over ? 'destructive' : 'secondary'} title={limit === null ? 'Tickets' : 'Tickets / work-in-progress limit'}>
            {count}{limit !== null && ` / ${limit}`}
          </Badge>
        </div>
      </header>
      {over && <p role="status" className="text-xs text-destructive">Over the limit of {limit}: finish something before starting more.</p>}
      {editMode && <WipLimit columnId={column.id} token={token} value={limit} onChange={setLimit} />}
      {note}
      <div className="grid content-start gap-3">{children}</div>
    </section>
  );
}

// WipLimit edits a column's advisory work-in-progress limit; empty removes it. Saves on Enter or when it loses focus.
function WipLimit({ columnId, token, value, onChange }: { columnId: string; token: string; value: number | null; onChange: (v: number | null) => void }) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  const [error, setError] = useState('');
  async function commit() {
    const n = draft.trim() === '' ? 0 : Number(draft);
    if (!Number.isInteger(n) || n < 0 || n > 999) return setError('Use a whole number from 1 to 999, or leave it empty.');
    if ((value ?? 0) === n) return setError('');
    try {
      await columns.update(columnId, { wip_limit: n }, token);
      onChange(n === 0 ? null : n);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'Only organization admins and this board’s team leaders can change column settings.' : 'Couldn’t save the limit. Please try again.');
    }
  }
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-2">
        WIP limit
        <Input
          type="number" min={1} max={999} placeholder="None" value={draft} className="h-7 w-20"
          onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void commit(); } }}
        />
      </span>
      {error && <span role="alert" className="text-destructive">{error}</span>}
    </label>
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
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'Only organization admins and this board’s team leaders can add columns.' : 'Could not add this column. Try again.');
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

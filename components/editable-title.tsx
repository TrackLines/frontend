'use client';

import { useState, type FormEvent } from 'react';
import { CheckIcon, PencilIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  value: string;
  label: string; // what it names, e.g. "board": "Rename board", "Board name"
  editable: boolean; // when false it's plain text
  onSave: (name: string) => Promise<void>; // throw to keep editing and show the error
  as?: 'h1' | 'h2';
  className?: string;
  maxLength?: number;
};

// EditableTitle is a heading that turns into an input in place: click the name or the pencil, Enter saves, Escape cancels.
export function EditableTitle({ value, label, editable, onSave, as: Tag = 'h1', className = '', maxLength = 120 }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function start() {
    setDraft(value);
    setError('');
    setEditing(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = draft.trim();
    if (!next || next === value) return setEditing(false);
    setSaving(true);
    setError('');
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      setError(`Couldn’t rename the ${label}. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  if (editing && editable) {
    return (
      <form onSubmit={save} className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        <Input
          autoFocus aria-label={`${label[0].toUpperCase()}${label.slice(1)} name`} value={draft} maxLength={maxLength} required
          className={`h-auto min-w-0 flex-1 py-1 ${className}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
        />
        <Button type="submit" size="icon-sm" aria-label="Save name" disabled={saving || !draft.trim()}><CheckIcon /></Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Cancel renaming" disabled={saving} onClick={() => setEditing(false)}><XIcon /></Button>
        {error && <p role="alert" className="w-full text-sm text-destructive">{error}</p>}
      </form>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-1">
      <Tag
        className={`min-w-0 truncate ${editable ? 'cursor-text rounded-md hover:bg-muted/60' : ''} ${className}`}
        onClick={editable ? start : undefined}
      >
        {value}
      </Tag>
      {editable && (
        <Button type="button" size="icon-sm" variant="ghost" className="shrink-0 text-muted-foreground" aria-label={`Rename ${label}`} onClick={start}>
          <PencilIcon />
        </Button>
      )}
    </div>
  );
}

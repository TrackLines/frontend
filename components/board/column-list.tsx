'use client';

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDownIcon, ArrowUpIcon, BotIcon, BotOffIcon, GripVerticalIcon, LockIcon, Trash2Icon } from 'lucide-react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addColumn, changeColumn, MAX_COLUMN_NAME, movable, moveColumn, pickReview, removeColumn, reviewKey, type Draft, type DraftColumn } from '@/lib/board/board-edit';

// ColumnList: the edit board page's columns, as a sortable list (TL-470). Drag the handle (or use the
// arrows, or the keyboard) to reorder; rename; set a WIP limit; add (before Done); remove an empty
// one. To do stays first and Done last. With agent review on, a robot marks the column agents' finished
// work waits in, and the others' crossed-out robot picks them instead (TL-673). Every change is to the
// draft: the page saves it.
export function ColumnList({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const { t } = useLingui();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const middle = draft.columns.filter((_, i) => movable(draft, i));
  const review = reviewKey(draft);
  const [adding, setAdding] = useState('');
  const [next, setNext] = useState(1);

  function dropped(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    onChange(moveColumn(draft, String(e.active.id), draft.columns.findIndex((c) => c.key === e.over!.id)));
  }
  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!adding.trim()) return;
    onChange(addColumn(draft, adding, `new-${next}`));
    setNext((n) => n + 1);
    setAdding('');
  }
  const first = draft.columns[0];
  const last = draft.columns.length > 1 ? draft.columns[draft.columns.length - 1] : undefined;

  return (
    <div className="grid gap-2">
      <ol className="grid gap-2" aria-label={t`Columns, in order`}>
        {first && <PinnedRow column={first} note={t`first: new tickets start here`} onRename={(name) => onChange(changeColumn(draft, first.key, { name }))} />}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dropped}>
          <SortableContext items={middle.map((c) => c.key)} strategy={verticalListSortingStrategy}>
            {middle.map((c, i) => (
              <SortableRow key={c.key} column={c} review={review ? review === c.key : undefined} onReview={() => onChange(pickReview(draft, c.key))} upFirst={i === 0} downLast={i === middle.length - 1}
                onChange={(change) => onChange(changeColumn(draft, c.key, change))}
                onMove={(d) => onChange(moveColumn(draft, c.key, draft.columns.findIndex((x) => x.key === c.key) + d))}
                onRemove={() => onChange(removeColumn(draft, c.key))} />
            ))}
          </SortableContext>
        </DndContext>
        {last && <PinnedRow column={last} note={t`last: a ticket here is done`} onRename={(name) => onChange(changeColumn(draft, last.key, { name }))} />}
      </ol>
      <form onSubmit={add} className="flex gap-2">
        <Input aria-label={t`New column name`} placeholder={t`New column, e.g. Review`} value={adding} maxLength={MAX_COLUMN_NAME} onChange={(e) => setAdding(e.target.value)} className="max-w-xs" />
        <Button type="submit" variant="outline" disabled={!adding.trim()}><Trans>Add column</Trans></Button>
        <span className="self-center text-xs text-muted-foreground">{last ? <Trans>New columns go before {last.name}.</Trans> : <Trans>New columns go before Done.</Trans>}</span>
      </form>
    </div>
  );
}

function PinnedRow({ column, note, onRename }: { column: DraftColumn; note: string; onRename: (name: string) => void }) {
  const { t } = useLingui();
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2">
      <LockIcon className="size-4 text-muted-foreground" aria-label={t`Stays in place`} />
      <Input aria-label={t`Column name: ${column.name}`} value={column.name} maxLength={MAX_COLUMN_NAME} onChange={(e) => onRename(e.target.value)} className="h-8 max-w-xs" />
      <span className="text-xs text-muted-foreground">{note}</span>
    </li>
  );
}

function SortableRow({ column, review, onReview, upFirst, downLast, onChange, onMove, onRemove }: {
  column: DraftColumn; review?: boolean; onReview: () => void; upFirst: boolean; downLast: boolean;
  onChange: (c: Partial<Pick<DraftColumn, 'name' | 'wip'>>) => void; onMove: (d: number) => void; onRemove: () => void;
}) {
  const { t } = useLingui();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: column.key });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2 ${isDragging ? 'z-10 shadow-md' : ''}`}>
      <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={t`Drag ${column.name} to reorder`}
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing">
        <GripVerticalIcon className="size-4" />
      </button>
      <Input aria-label={t`Column name: ${column.name}`} value={column.name} maxLength={MAX_COLUMN_NAME} onChange={(e) => onChange({ name: e.target.value })} className="h-8 max-w-xs" />
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Trans>WIP limit</Trans>
        <Input type="number" min={1} max={999} placeholder={t`None`} className="h-8 w-20" value={column.wip ?? ''}
          onChange={(e) => onChange({ wip: e.target.value === '' ? null : Number(e.target.value) })} />
      </label>
      <span className="ml-auto flex gap-1">
        {review === true && (
          <Button type="button" size="icon-sm" variant="ghost" aria-pressed aria-label={t`Agents’ finished work waits in ${column.name}`}
            title={t`Agents’ finished work waits here for review`}><BotIcon /></Button>
        )}
        {review === false && (
          <Button type="button" size="icon-sm" variant="ghost" className="text-muted-foreground" aria-pressed={false} aria-label={t`Make ${column.name} the review column`}
            disabled={!column.id} title={column.id ? t`Make this the review column` : t`Save the board first to pick a new column`} onClick={onReview}><BotOffIcon /></Button>
        )}
        <Button type="button" size="icon-sm" variant="ghost" aria-label={t`Move ${column.name} earlier`} disabled={upFirst} onClick={() => onMove(-1)}><ArrowUpIcon /></Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label={t`Move ${column.name} later`} disabled={downLast} onClick={() => onMove(1)}><ArrowDownIcon /></Button>
        <Button type="button" size="icon-sm" variant="ghost" className="text-destructive" aria-label={t`Remove ${column.name}`} disabled={column.tickets > 0}
          title={column.tickets > 0 ? t`Move its tickets out first` : undefined} onClick={onRemove}><Trash2Icon /></Button>
      </span>
    </li>
  );
}

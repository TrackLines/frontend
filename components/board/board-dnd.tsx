'use client';

import {
  closestCorners, DndContext, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRef, useState, type ReactNode } from 'react';
import type { Column } from '@/lib/api';
import { moveTicket, placement } from './move';

type Props = {
  boardId: string;
  columns: Column[];
  onChange: (columns: Column[]) => void; // optimistic local update
  onMove: (ticketId: string, columnId: string, position: number) => Promise<void>; // persist
  children: ReactNode;
};

// BoardDnd lets tickets be dragged within and across columns: the board updates instantly,
// the move is saved, and on failure the board snaps back with a message.
export function BoardDnd({ boardId, columns, onChange, onMove, children }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), // small threshold so clicks still work
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const before = useRef<Column[] | null>(null);
  const [error, setError] = useState('');

  function over({ active, over }: DragOverEvent) {
    if (over) onChange(moveTicket(columns, String(active.id), String(over.id)));
  }

  async function end({ active, over }: DragEndEvent) {
    const snapshot = before.current;
    before.current = null;
    if (!snapshot || !over) {
      if (snapshot) onChange(snapshot);
      return;
    }
    const next = moveTicket(columns, String(active.id), String(over.id));
    onChange(next);
    const was = placement(snapshot, String(active.id));
    const now = placement(next, String(active.id));
    if (!now || (was && was.columnId === now.columnId && was.position === now.position)) return;
    try {
      await onMove(String(active.id), now.columnId, now.position);
    } catch {
      onChange(snapshot);
      setError('Couldn’t move that ticket — it’s back where it was. Please try again.');
    }
  }

  return (
    <DndContext
      id={`board-${boardId}`} // stable id: avoids SSR/client aria-id mismatch
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={() => { before.current = columns; setError(''); }}
      onDragOver={over}
      onDragEnd={end}
      onDragCancel={() => { if (before.current) onChange(before.current); before.current = null; }}
    >
      {error && <p role="alert" className="px-6 pt-3 text-sm text-destructive">{error}</p>}
      {children}
    </DndContext>
  );
}

// DroppableColumn makes a column's ticket list a sort/drop target, including when it's empty.
export function DroppableColumn({ id, ticketIds, children }: { id: string; ticketIds: string[]; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <SortableContext id={id} items={ticketIds} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className={`grid min-w-0 grid-cols-1 min-h-16 content-start gap-3 rounded-lg ${isOver ? 'bg-primary/5' : ''}`}>
        {children}
      </div>
    </SortableContext>
  );
}

// SortableTicket makes its child (a ticket card) draggable.
export function SortableTicket({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`min-w-0 cursor-grab touch-none active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
      {...listeners}
      // keyboard drag only when the card itself is focused, so Enter/Space on "Edit ticket" still edits
      onKeyDown={(e) => { if (e.target === e.currentTarget) listeners?.onKeyDown?.(e); }}
      // the card's dialogs are portals, but React still bubbles their events here: only drag from the card itself,
      // so selecting text in an open ticket doesn't pick up the card behind it
      onPointerDown={(e) => { if (e.currentTarget.contains(e.target as Node)) listeners?.onPointerDown?.(e); }}
    >
      {children}
    </div>
  );
}

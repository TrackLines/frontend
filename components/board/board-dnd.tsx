'use client';

import {
  closestCorners, DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin, useDroppable, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRef, useState, type ReactNode } from 'react';
import type { Assignee, Column } from '@/lib/api';
import { draggedPerson } from '@/lib/person-drag';
import { PersonFace } from './person-face';
import { moveTicket, placement } from './move';

type Props = {
  boardId: string;
  columns: Column[];
  onChange: (columns: Column[]) => void; // optimistic local update
  onMove: (ticketId: string, columnId: string, position: number) => Promise<void>; // persist
  onAssign?: (ticketId: string, userId: string) => Promise<void>; // a standup face dropped on a ticket (TL-266)
  people?: Assignee[] | null;
  children: ReactNode;
};

// BoardDnd lets tickets be dragged within and across columns: the board updates instantly,
// the move is saved, and on failure the board snaps back with a message.
export function BoardDnd({ boardId, columns, onChange, onMove, onAssign, people = null, children }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), // small threshold so clicks still work
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const before = useRef<Column[] | null>(null);
  const [error, setError] = useState('');
  const [face, setFace] = useState<string | null>(null); // whose face is being dragged

  // a face lands on the ticket under the pointer, never on a column; tickets move as before
  const columnIds = new Set(columns.map((c) => c.id));
  const collide: CollisionDetection = (args) => draggedPerson(String(args.active.id))
    ? pointerWithin({ ...args, droppableContainers: args.droppableContainers.filter((c) => !columnIds.has(String(c.id))) })
    : closestCorners(args);

  function over({ active, over }: DragOverEvent) {
    if (over && !draggedPerson(String(active.id))) onChange(moveTicket(columns, String(active.id), String(over.id)));
  }

  async function end({ active, over }: DragEndEvent) {
    const person = draggedPerson(String(active.id));
    if (person) {
      setFace(null);
      if (!over || !onAssign) return;
      try {
        await onAssign(String(over.id), person);
      } catch {
        setError('Couldn’t assign that ticket. Please try again.');
      }
      return;
    }
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
      collisionDetection={collide}
      onDragStart={({ active }) => {
        setError('');
        const person = draggedPerson(String(active.id));
        if (person) setFace(person); else before.current = columns;
      }}
      onDragOver={over}
      onDragEnd={end}
      onDragCancel={() => { if (before.current) onChange(before.current); before.current = null; setFace(null); }}
    >
      {error && <p role="alert" className="px-6 pt-3 text-sm text-destructive">{error}</p>}
      {children}
      <DragOverlay dropAnimation={null}>{face && <PersonFace id={face} people={people} className="size-8 shadow-md ring-2 ring-primary" />}</DragOverlay>
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
// disabled: tickets stay put (e.g. while the board is being edited)
export function SortableTicket({ id, disabled = false, children }: { id: string; disabled?: boolean; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver, active } = useSortable({ id, disabled });
  const faceOver = isOver && !!active && !!draggedPerson(String(active.id)); // a face about to assign this ticket
  return (
    <div
      ref={setNodeRef}
      // a face being dragged doesn't shuffle the cards
      style={active && draggedPerson(String(active.id)) ? undefined : { transform: CSS.Transform.toString(transform), transition }}
      className={`min-w-0 rounded-xl ${disabled ? '' : 'cursor-grab touch-none active:cursor-grabbing'} ${isDragging ? 'opacity-50' : ''} ${faceOver ? 'ring-2 ring-primary' : ''}`}
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

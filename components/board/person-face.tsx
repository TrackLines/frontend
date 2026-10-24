'use client';

import { useDraggable } from '@dnd-kit/core';
import { useLingui } from '@lingui/react/macro';
import { initials } from '@/components/hosted-bar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Assignee } from '@/lib/api';
import { awayText } from '@/lib/away';
import { cn } from '@/lib/utils';
import { personLabel } from '@/lib/people';
import { personDragId } from '@/lib/person-drag';

// PersonFace: someone's avatar, or their initials; faded, with when they're back, while on holiday (TL-410).
export function PersonFace({ id, people, className }: { id: string; people: Assignee[] | null; className?: string }) {
  const { t, i18n } = useLingui();
  const person = people?.find((p) => p.id === id);
  const label = personLabel(i18n, id, people);
  const name = person?.label === 'You' ? person.name || t`You` : label;
  const away = person?.away ? awayText(person, i18n) : null;
  return (
    <Avatar className={cn(className, away && 'opacity-50 grayscale')} title={away ? `${name}: ${away}` : undefined} data-away={away ? '' : undefined}>
      {person?.image_url && <AvatarImage src={person.image_url} alt="" />}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

// DraggableFace: a face the standup's host drags onto a ticket to assign them. It's a plain
// draggable, not a sortable: the running order never changes, and the face stays put while a copy
// follows the pointer (BoardDnd's overlay).
export function DraggableFace({ id, people, disabled }: { id: string; people: Assignee[] | null; disabled: boolean }) {
  const { t, i18n } = useLingui();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: personDragId(id), disabled });
  if (disabled) return <PersonFace id={id} people={people} className="size-6" />;
  return (
    <span ref={setNodeRef} {...attributes} {...listeners}
      aria-label={t`Drag ${personLabel(i18n, id, people)} onto a ticket to assign them`} title={t`Drag onto a ticket to assign`}
      className={`shrink-0 cursor-grab touch-none rounded-full active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}>
      <PersonFace id={id} people={people} className="size-6" />
    </span>
  );
}

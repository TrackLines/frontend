import type { ChatKind } from './api';

// The notifications a space can get, in the order they're offered. @mentions aren't here: they're personal.
// In lib, not the settings form, so server pages (the docs) can read it: a 'use client' module's values aren't.
export const CHAT_KINDS: { kind: ChatKind; label: string }[] = [
  { kind: 'created', label: 'New tickets' },
  { kind: 'review', label: 'Needs review' },
  { kind: 'approval', label: 'Planned sprint needs approval' },
  { kind: 'over_capacity', label: 'Sprint started over capacity' },
  { kind: 'finished', label: 'Ticket finished' },
  { kind: 'wont_do', label: 'Closed as won’t do' },
  { kind: 'assigned', label: 'Ticket assigned (“assigned TL-12 to Sam”)' },
  { kind: 'sent_back', label: 'Sent back from review' },
  { kind: 'retention', label: 'Files due for deletion' },
];

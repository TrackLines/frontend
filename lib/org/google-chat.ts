import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { ChatKind } from '../api';

// The notifications a space can get, in the order they're offered. @mentions aren't here: they're personal.
// Labels are msg descriptors: translate them with i18n._(label) where they're shown.
// In lib, not the settings form, so server pages (the docs) can read it: a 'use client' module's values aren't.
export const CHAT_KINDS: { kind: ChatKind; label: MessageDescriptor }[] = [
  { kind: 'created', label: msg`New tickets` },
  { kind: 'review', label: msg`Needs review` },
  { kind: 'approval', label: msg`Planned sprint needs approval` },
  { kind: 'over_capacity', label: msg`Sprint started over capacity` },
  { kind: 'finished', label: msg`Ticket finished` },
  { kind: 'wont_do', label: msg`Closed as won’t do` },
  { kind: 'assigned', label: msg`Ticket assigned (“assigned TL-12 to Sam”)` },
  { kind: 'sent_back', label: msg`Sent back from review` },
  { kind: 'retention', label: msg`Files due for deletion` },
];

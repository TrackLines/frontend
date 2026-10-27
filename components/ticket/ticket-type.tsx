'use client';

import type { I18n, MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TicketType } from '@/lib/api';

// label, plural: translate with i18n._(label)
export const TICKET_TYPES: { value: TicketType; label: MessageDescriptor; plural: MessageDescriptor }[] = [
  { value: 'bug', label: msg`Bug`, plural: msg`Bugs` },
  { value: 'feature', label: msg`Feature`, plural: msg`Features` },
  { value: 'task', label: msg`Task`, plural: msg`Tasks` },
  { value: 'spike', label: msg`Spike`, plural: msg`Spikes` }, // timeboxed investigation (TL-502)
  { value: 'epic', label: msg`Epic`, plural: msg`Epics` }, // backlog only: large work, sized by its sub-tickets (TL-213)
];

export function TypeBadge({ type }: { type: TicketType }) {
  if (type === 'epic') return <Badge variant="outline" className="border-violet-500/50 text-violet-700 dark:text-violet-300"><Trans>epic</Trans></Badge>;
  if (type === 'spike') return <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300"><Trans>spike</Trans></Badge>;
  return <Badge variant={type === 'bug' ? 'destructive' : type === 'feature' ? 'default' : 'secondary'}>{type === 'bug' ? <Trans>bug</Trans> : type === 'feature' ? <Trans>feature</Trans> : <Trans>task</Trans>}</Badge>;
}

// formatTimebox renders a spike's timebox as "1d 4h" (TL-502); "" when it has none. Days/hours are
// stored as entered, so there's nothing to normalise.
export function formatTimebox(i18n: I18n, days?: number | null, hours?: number | null): string {
  const parts = [];
  if (days) parts.push(i18n._(msg`${days}d`));
  if (hours) parts.push(i18n._(msg`${hours}h`));
  return parts.join(' ');
}

// TimeboxBadge shows a spike's timebox (TL-502); nothing when it isn't set.
export function TimeboxBadge({ days, hours }: { days?: number | null; hours?: number | null }) {
  const { i18n } = useLingui();
  const timebox = formatTimebox(i18n, days, hours);
  if (!timebox) return null;
  return <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300" title={i18n._(msg`Spike timebox`)}><Trans>timebox {timebox}</Trans></Badge>;
}

// pickerTypes: the types a picker offers; without epic, Epic only if it's already the value.
export const pickerTypes = (value: TicketType, epic: boolean) => TICKET_TYPES.filter((t) => epic || t.value !== 'epic' || value === 'epic');

// TypePicker: a labelled dropdown for a ticket's type, like Priority beside it. epic: offer Epic (not
// when creating on a board: epics live in the backlog).
export function TypePicker({ value, onChange, epic = true }: { value: TicketType; onChange: (t: TicketType) => void; epic?: boolean }) {
  const { i18n } = useLingui();
  const types = pickerTypes(value, epic);
  const labels = Object.fromEntries(TICKET_TYPES.map((t) => [t.value, i18n._(t.label)]));
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <Trans>Type</Trans>
      <Select items={labels} value={value} onValueChange={(v) => { if (v) onChange(v as TicketType); }}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {types.map((t) => <SelectItem key={t.value} value={t.value}>{labels[t.value]}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

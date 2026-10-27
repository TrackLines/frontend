'use client';

import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tickets, type Assignee, type Ticket } from '@/lib/api';
import { awayText } from '@/lib/work/away';
import { personLabel, shownLabel } from '@/lib/work/people';

const NONE = '__unassigned';

// assigneeItems: value → label for the picker. Keeps a current assignee that's no longer a choice
// (revoked key, imported) so the trigger still shows who holds the ticket.
export function assigneeItems(i18n: I18n, list: Assignee[], current: string | null | undefined): Record<string, string> {
  const assignable = list.filter((a) => a.kind !== 'service');
  const items: Record<string, string> = {
    [NONE]: i18n._(msg`Unassigned`),
    ...Object.fromEntries(assignable.map((a) => { const label = shownLabel(i18n, a); return [a.id, a.kind === 'ai' || !a.kind ? i18n._(msg`${label} · AI`) : withAway(i18n, label, a)]; })),
  };
  if (current && !(current in items)) {
    items[current] = current.startsWith('user_') ? i18n._(msg`Unavailable organization member`) : personLabel(i18n, current);
  }
  return items;
}

// withAway: "Sam · on holiday until Fri 23 Oct" / "Sam · off from Thu 23 Oct" (TL-410).
function withAway(i18n: I18n, label: string, person: Assignee): string {
  const away = awayText(person, i18n);
  return away ? `${label} · ${away.charAt(0).toLowerCase()}${away.slice(1)}` : label;
}

// awayWarning: shown under the picker when the ticket's assignee is away now.
export function awayWarning(i18n: I18n, list: Assignee[], value: string | null | undefined): string | null {
  const person = value ? list.find((a) => a.id === value && a.away) : undefined;
  if (!person) return null;
  // mid-sentence: lower-case it ("Sam is on holiday…"); English reads better as "off for a company day"
  const text = awayText(person, i18n)!.replace(/^Company day off/, 'off for a company day');
  const away = text.charAt(0).toLowerCase() + text.slice(1);
  const name = person.name || person.label;
  return person.label === 'You' ? i18n._(msg`You’re ${away}.`) : i18n._(msg`${name} is ${away}.`);
}

// AssigneeSelect hands a ticket to a person or AI key; service keys aren't assignable.
export function AssigneeSelect({ ticketId, value, token, onChange }: {
  ticketId: string; value: string | null | undefined; token: string; onChange: (t: Ticket) => void;
}) {
  const { i18n } = useLingui();
  const [list, setList] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    setList([]);
    tickets.assignees(token).then(
      (assignees) => { if (active) setList(assignees); },
      () => { if (active) setLoadError(i18n._(msg`Couldn’t load organization members and agents.`)); },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);
  const items = assigneeItems(i18n, list, value);

  async function assign(v: string) {
    setSaving(true);
    setSaveError('');
    try {
      onChange(await tickets.assign(ticketId, v === NONE ? null : v, token));
    } catch {
      setSaveError(i18n._(msg`Couldn’t change the assignee. Please try again.`));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-1">
      <Select items={items} value={value || NONE} disabled={saving || loading || Boolean(loadError)} onValueChange={(v) => { if (v) void assign(String(v)); }}>
        <SelectTrigger className="w-full" aria-label={i18n._(msg`Assignee`)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      {awayWarning(i18n, list, value) && <p className="text-sm text-amber-700 dark:text-amber-400">{awayWarning(i18n, list, value)}</p>}
      {(loadError || saveError) && <p role="alert" className="text-sm text-destructive">{loadError || saveError}</p>}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tickets, type Assignee, type Ticket } from '@/lib/api';
import { personLabel } from '@/lib/people';

const NONE = '__unassigned';

// assigneeItems: value → label for the picker. Keeps a current assignee that's no longer a choice
// (revoked key, imported) so the trigger still shows who holds the ticket.
export function assigneeItems(list: Assignee[], current: string | null | undefined): Record<string, string> {
  const assignable = list.filter((a) => a.kind !== 'service');
  const items: Record<string, string> = {
    [NONE]: 'Unassigned',
    ...Object.fromEntries(assignable.map((a) => [a.id, a.kind === 'ai' || !a.kind ? `${a.label} (AI)` : a.label])),
  };
  if (current && !(current in items)) {
    items[current] = current.startsWith('user_') ? 'Unavailable organization member' : personLabel(current);
  }
  return items;
}

// AssigneeSelect hands a ticket to a person or AI key; service keys aren't assignable.
export function AssigneeSelect({ ticketId, value, token, onChange }: {
  ticketId: string; value: string | null | undefined; token: string; onChange: (t: Ticket) => void;
}) {
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
      () => { if (active) setLoadError('Couldn’t load organization members and agents.'); },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);
  const items = assigneeItems(list, value);

  async function assign(v: string) {
    setSaving(true);
    setSaveError('');
    try {
      onChange(await tickets.assign(ticketId, v === NONE ? null : v, token));
    } catch {
      setSaveError('Couldn’t change the assignee. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-1">
      <Select items={items} value={value || NONE} disabled={saving || loading || Boolean(loadError)} onValueChange={(v) => { if (v) void assign(String(v)); }}>
        <SelectTrigger className="w-full" aria-label="Assignee">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      {(loadError || saveError) && <p role="alert" className="text-sm text-destructive">{loadError || saveError}</p>}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tickets, type Assignee, type Ticket } from '@/lib/api';
import { personLabel } from '@/lib/people';

const NONE = '__unassigned';

// assigneeItems: value → label for the picker. Keeps a current assignee that's no longer a choice
// (revoked key, imported) so the trigger still shows who holds the ticket.
export function assigneeItems(list: Assignee[], current: string | null | undefined): Record<string, string> {
  const items: Record<string, string> = { [NONE]: 'Unassigned', ...Object.fromEntries(list.map((a) => [a.id, a.label])) };
  if (current && !(current in items)) items[current] = personLabel(current);
  return items;
}

// AssigneeSelect hands a ticket to you or one of your agents (API keys); saves on change.
export function AssigneeSelect({ ticketId, value, token, onChange }: {
  ticketId: string; value: string | null | undefined; token: string; onChange: (t: Ticket) => void;
}) {
  const [list, setList] = useState<Assignee[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { tickets.assignees(token).then(setList, () => setError('Couldn’t load assignees.')); }, []); // once; token refreshes don't matter
  const items = assigneeItems(list, value);

  async function assign(v: string) {
    setSaving(true);
    setError('');
    try {
      onChange(await tickets.assign(ticketId, v === NONE ? null : v, token));
    } catch {
      setError('Couldn’t change the assignee. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-1">
      <Select items={items} value={value || NONE} disabled={saving} onValueChange={(v) => { if (v) void assign(String(v)); }}>
        <SelectTrigger className="w-full" aria-label="Assignee">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

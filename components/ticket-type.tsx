import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TicketType } from '@/lib/api';

export const TICKET_TYPES: { value: TicketType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'task', label: 'Task' },
];

export function TypeBadge({ type }: { type: TicketType }) {
  return <Badge variant={type === 'bug' ? 'destructive' : type === 'feature' ? 'default' : 'secondary'}>{type}</Badge>;
}

const TYPE_LABELS = Object.fromEntries(TICKET_TYPES.map((t) => [t.value, t.label]));

// TypePicker: a labelled dropdown for a ticket's type, like Priority beside it.
export function TypePicker({ value, onChange }: { value: TicketType; onChange: (t: TicketType) => void }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      Type
      <Select items={TYPE_LABELS} value={value} onValueChange={(v) => { if (v) onChange(v as TicketType); }}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {TICKET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

import { Badge } from '@/components/ui/badge';
import type { TicketType } from '@/lib/api';

export const TICKET_TYPES: { value: TicketType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'task', label: 'Task' },
];

export function TypeBadge({ type }: { type: TicketType }) {
  return <Badge variant={type === 'bug' ? 'destructive' : type === 'feature' ? 'default' : 'secondary'}>{type}</Badge>;
}

// TypePicker: radio group for a ticket's type (native inputs: keyboard + screen readers for free).
export function TypePicker({ value, onChange, name = 'type' }: { value: TicketType; onChange: (t: TicketType) => void; name?: string }) {
  return (
    <fieldset className="flex flex-wrap gap-4">
      <legend className="mb-1.5 text-sm font-medium">Type</legend>
      {TICKET_TYPES.map((t) => (
        <label key={t.value} className="flex items-center gap-2 text-sm">
          <input type="radio" name={name} value={t.value} checked={value === t.value} onChange={() => onChange(t.value)} className="accent-primary" />
          {t.label}
        </label>
      ))}
    </fieldset>
  );
}

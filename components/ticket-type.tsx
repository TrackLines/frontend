import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TicketType } from '@/lib/api';

export const TICKET_TYPES: { value: TicketType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'task', label: 'Task' },
  { value: 'spike', label: 'Spike' }, // timeboxed investigation (TL-502)
  { value: 'epic', label: 'Epic' }, // backlog only: large work, sized by its sub-tickets (TL-213)
];

export function TypeBadge({ type }: { type: TicketType }) {
  if (type === 'epic') return <Badge variant="outline" className="border-violet-500/50 text-violet-700 dark:text-violet-300">epic</Badge>;
  if (type === 'spike') return <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300">spike</Badge>;
  return <Badge variant={type === 'bug' ? 'destructive' : type === 'feature' ? 'default' : 'secondary'}>{type}</Badge>;
}

// formatTimebox renders a spike's timebox as "1d 4h" (TL-502); "" when it has none. Days/hours are
// stored as entered, so there's nothing to normalise.
export function formatTimebox(days?: number | null, hours?: number | null): string {
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  return parts.join(' ');
}

// TimeboxBadge shows a spike's timebox (TL-502); nothing when it isn't set.
export function TimeboxBadge({ days, hours }: { days?: number | null; hours?: number | null }) {
  const timebox = formatTimebox(days, hours);
  if (!timebox) return null;
  return <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300" title="Spike timebox">timebox {timebox}</Badge>;
}

const TYPE_LABELS = Object.fromEntries(TICKET_TYPES.map((t) => [t.value, t.label]));

// pickerTypes: the types a picker offers; without epic, Epic only if it's already the value.
export const pickerTypes = (value: TicketType, epic: boolean) => TICKET_TYPES.filter((t) => epic || t.value !== 'epic' || value === 'epic');

// TypePicker: a labelled dropdown for a ticket's type, like Priority beside it. epic: offer Epic (not
// when creating on a board: epics live in the backlog).
export function TypePicker({ value, onChange, epic = true }: { value: TicketType; onChange: (t: TicketType) => void; epic?: boolean }) {
  const types = pickerTypes(value, epic);
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      Type
      <Select items={TYPE_LABELS} value={value} onValueChange={(v) => { if (v) onChange(v as TicketType); }}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {types.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </label>
  );
}

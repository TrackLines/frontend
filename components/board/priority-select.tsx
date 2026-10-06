'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
// items gives the trigger a label ("Medium") instead of the raw value ("medium")
const LABELS = Object.fromEntries(PRIORITIES.map((p) => [p, p.charAt(0).toUpperCase() + p.slice(1)]));

export function PrioritySelect({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <Select items={LABELS} value={value || null} onValueChange={(v) => { if (v) onChange(String(v)); }}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Set priority…" />
      </SelectTrigger>
      <SelectContent>
        {PRIORITIES.map((p) => (
          <SelectItem key={p} value={p}>{LABELS[p]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

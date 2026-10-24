'use client';

import { useLingui } from '@lingui/react/macro';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export function PrioritySelect({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const { t } = useLingui();
  // items gives the trigger a label ("Medium") instead of the raw value ("medium")
  const LABELS: Record<string, string> = { low: t`Low`, medium: t`Medium`, high: t`High`, urgent: t`Urgent` };
  return (
    <Select items={LABELS} value={value || null} onValueChange={(v) => { if (v) onChange(String(v)); }}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t`Set priority…`} />
      </SelectTrigger>
      <SelectContent>
        {PRIORITIES.map((p) => (
          <SelectItem key={p} value={p}>{LABELS[p]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

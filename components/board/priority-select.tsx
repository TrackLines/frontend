'use client';

import { useLingui } from '@lingui/react/macro';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { priorityName, usePriorities } from '@/lib/board/priorities';

// PrioritySelect: the levels most urgent first, from the API when there's a token (TL-847).
export function PrioritySelect({ value, onChange, token }: { value: string | null; onChange: (v: string) => void; token?: string | null }) {
  const { t, i18n } = useLingui();
  const levels = usePriorities(token);
  // items gives the trigger a label ("Medium") instead of the raw value ("medium")
  const labels = Object.fromEntries(levels.map((l) => [l.key, priorityName(i18n, l)]));
  return (
    <Select items={labels} value={value || null} onValueChange={(v) => { if (v) onChange(String(v)); }}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t`Set priority…`} />
      </SelectTrigger>
      <SelectContent>
        {levels.map((l) => <SelectItem key={l.key} value={l.key}>{labels[l.key]}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

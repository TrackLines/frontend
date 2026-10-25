'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// DueDateField: a ticket's due date in the ticket form (TL-632). The browser's own date input: a
// localized calendar, keyboard entry, nothing to install; "" is no date.
export function DueDateField({ value, onChange }: { value: string; onChange: (day: string) => void }) {
  const { t } = useLingui();
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span><Trans>Due date <span className="font-normal text-muted-foreground">(optional)</span></Trans></span>
      <span className="flex items-center gap-1">
        <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} aria-label={t`Due date`} className="w-full" />
        {value && <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange('')} aria-label={t`Clear the due date`}><XIcon /></Button>}
      </span>
    </label>
  );
}

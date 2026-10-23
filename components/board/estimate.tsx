'use client';

import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError, boards } from '@/lib/api';
import { SCALES, scaleValues, type EstimateScale } from '@/lib/estimates';

const NONE = '__none';

// EstimateSelect picks a value on the board's scale; '' = not estimated. A board with a scale only
// takes estimated tickets, so `required` leaves out "Not estimated".
export function EstimateSelect({ scale, value, onChange, required = false, invalid = false, describedBy }: { scale: EstimateScale; value: string; onChange: (v: string) => void; required?: boolean; invalid?: boolean; describedBy?: string }) {
  const { t } = useLingui();
  const values = scaleValues(scale);
  const items = { [NONE]: required ? t`Choose an estimate…` : t`Not estimated`, ...Object.fromEntries(values.map((v) => [v, v])) };
  return (
    <Select items={items} value={value || NONE} onValueChange={(v) => onChange(v === NONE || !v ? '' : String(v))}>
      <SelectTrigger id="ticket-estimate" className="w-full" aria-required={required} aria-invalid={invalid || undefined} aria-describedby={describedBy}><SelectValue /></SelectTrigger>
      <SelectContent>
        {!required && <SelectItem value={NONE}>{t`Not estimated`}</SelectItem>}
        {values.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function EstimateBadge({ estimate }: { estimate?: string | null }) {
  const { t } = useLingui();
  if (!estimate) return null;
  return <Badge variant="outline" title={t`Estimate`} aria-label={t`Estimate ${estimate}`}>{estimate}</Badge>;
}


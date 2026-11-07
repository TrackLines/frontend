'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError, boards } from '@/lib/api';
import { SCALES, scaleValues, type EstimateScale } from '@/lib/board/estimates';

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

// EstimateBadge; explain adds a hover card saying what the number means, in the board's scale when it's
// known (TL-850).
export function EstimateBadge({ estimate, scale, explain = false }: { estimate?: string | null; scale?: EstimateScale | null; explain?: boolean }) {
  const { t, i18n } = useLingui();
  if (!estimate) return null;
  if (!explain) return <Badge variant="outline" title={t`Estimate`} aria-label={t`Estimate ${estimate}`}>{estimate}</Badge>;
  const named = SCALES.find((s) => s.value === scale && s.value !== 'none');
  const scaleName = named ? i18n._(named.label) : '';
  const what = scale === 'tshirt' ? t`Estimate: size ${estimate}` : t`Estimate: ${estimate} points`;
  return (
    <HoverCard>
      <HoverCardTrigger render={<span tabIndex={0} aria-label={what} className="rounded-4xl outline-none focus-visible:ring-2 focus-visible:ring-ring" />}>
        <Badge variant="outline">{estimate}</Badge>
      </HoverCardTrigger>
      <HoverCardContent className="grid gap-1">
        <p className="font-medium">{what}</p>
        <p className="text-muted-foreground">
          {scaleName ? <Trans>How much work the team thinks this is, on this board's {scaleName} scale.</Trans> : <Trans>How much work the team thinks this is.</Trans>}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}


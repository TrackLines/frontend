'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { boards } from '@/lib/api';
import { SCALES, scaleValues, type EstimateScale } from '@/lib/estimates';

const NONE = '__none';

// EstimateSelect picks a value on the board's scale; '' = not estimated.
export function EstimateSelect({ scale, value, onChange }: { scale: EstimateScale; value: string; onChange: (v: string) => void }) {
  const values = scaleValues(scale);
  const items = { [NONE]: 'Not estimated', ...Object.fromEntries(values.map((v) => [v, v])) };
  return (
    <Select items={items} value={value || NONE} onValueChange={(v) => onChange(v === NONE || !v ? '' : String(v))}>
      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Not estimated</SelectItem>
        {values.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function EstimateBadge({ estimate }: { estimate?: string | null }) {
  if (!estimate) return null;
  return <Badge variant="outline" title="Estimate" aria-label={`Estimate ${estimate}`}>{estimate}</Badge>;
}

// ScaleSetting chooses the board's scale. Switching clears estimates that are still open, so it asks first when there are any.
export function ScaleSetting({ boardId, scale, estimated, token, onChanged }: {
  boardId: string; scale: EstimateScale; estimated: number; token: string; onChanged: () => void;
}) {
  const [pending, setPending] = useState<EstimateScale | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const items = Object.fromEntries(SCALES.map((s) => [s.value, s.label]));

  async function apply(next: EstimateScale) {
    setBusy(true);
    setError('');
    try {
      await boards.update(boardId, { estimate_scale: next }, token);
      setPending(null);
      onChanged();
    } catch {
      setError('Couldn’t change the estimate scale. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Estimates</span>
      <Select items={items} value={scale} disabled={busy} onValueChange={(v) => {
        const next = v as EstimateScale;
        if (next === scale) return;
        if (estimated > 0) setPending(next);
        else void apply(next);
      }}>
        <SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SCALES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {pending && (
        <span role="alert" className="flex flex-wrap items-center gap-2">
          Clear {estimated} {estimated === 1 ? 'estimate' : 'estimates'} on open tickets?
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => apply(pending)}>Switch scale</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setPending(null)}>Keep</Button>
        </span>
      )}
      {error && <span role="alert" className="text-destructive">{error}</span>}
    </div>
  );
}

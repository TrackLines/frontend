'use client';

import { useLingui } from '@lingui/react';
import { Trans, useLingui as useT } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError, workingWeek, type WorkWeek, type WorkWeeks } from '@/lib/api';
import { setWorkingWeeks } from '@/lib/hooks/use-working-week';
import { dates } from '@/lib/i18n';
import { DEFAULT_WEEK, hhmm, minutes, validWeek } from '@/lib/org/working-week';

// dayNames: Sunday (0) to Saturday (6) in the reader's language (a known Sunday, 2026-10-25, onwards).
function useDayNames(): string[] {
  const { i18n } = useLingui();
  const fmt = dates(i18n, { weekday: 'long', timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, d) => fmt.format(new Date(Date.UTC(2026, 9, 25 + d))));
}

// WorkingWeekForm (TL-510): which days are worked, which day starts the week, and the hours. Shown in
// the order the week starts on.
export function WorkingWeekForm({ value, onChange, disabled = false }: { value: WorkWeek; onChange: (w: WorkWeek) => void; disabled?: boolean }) {
  const { t } = useT();
  const names = useDayNames();
  const order = Array.from({ length: 7 }, (_, i) => (value.week_start + i) % 7);
  const toggle = (d: number, on: boolean) => onChange({ ...value, days: on ? [...value.days, d].sort() : value.days.filter((x) => x !== d) });
  return (
    <div className="grid gap-4 text-sm">
      <fieldset className="grid gap-2" disabled={disabled}>
        <legend className="mb-1 font-medium"><Trans>Working days</Trans></legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {order.map((d) => (
            <label key={d} className="flex items-center gap-2">
              <Checkbox checked={value.days.includes(d)} onCheckedChange={(on) => toggle(d, on === true)} disabled={disabled} />
              {names[d]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-1.5">
          <span className="font-medium"><Trans>Week starts on</Trans></span>
          <Select items={Object.fromEntries(names.map((n, d) => [String(d), n]))} value={String(value.week_start)} disabled={disabled}
            onValueChange={(v) => v != null && onChange({ ...value, week_start: Number(v) })}>
            <SelectTrigger aria-label={t`Week starts on`} className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{names.map((n, d) => <SelectItem key={d} value={String(d)}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <label className="grid gap-1.5">
          <span className="font-medium"><Trans>Work starts</Trans></span>
          <Input type="time" className="w-32" value={hhmm(value.start_minute)} disabled={disabled}
            onChange={(e) => { const m = minutes(e.target.value); if (Number.isFinite(m)) onChange({ ...value, start_minute: m }); }} />
        </label>
        <label className="grid gap-1.5">
          <span className="font-medium"><Trans>Work ends</Trans></span>
          <Input type="time" className="w-32" value={hhmm(value.end_minute % (24 * 60))} disabled={disabled}
            onChange={(e) => { const m = minutes(e.target.value); if (Number.isFinite(m)) onChange({ ...value, end_minute: m === 0 ? 24 * 60 : m }); }} />
        </label>
      </div>
      {!validWeek(value) && <p role="alert" className="text-destructive"><Trans>Pick at least one working day, and hours of at least one hour.</Trans></p>}
    </div>
  );
}

const same = (a: WorkWeek, b: WorkWeek) => JSON.stringify({ ...a, days: [...a.days].sort() }) === JSON.stringify({ ...b, days: [...b.days].sort() });

// What a working week drives, said once wherever it's set.
export function WorkingWeekNote() {
  return <p className="text-sm text-muted-foreground"><Trans>Spike timeboxes count these hours (a timebox day is one working day), sprint planning counts these days, reports start weeks on this day, and a sprint always ends on a working day. Hours are in each person’s own timezone.</Trans></p>;
}

// OrgWorkingWeek: the organization's working week, set by its admins; everyone else sees it.
export function OrgWorkingWeek({ token, admin }: { token: string; admin: boolean }) {
  const { t } = useT();
  const [weeks, setWeeks] = useState<WorkWeeks | null>(null);
  const [draft, setDraft] = useState<WorkWeek>(DEFAULT_WEEK);
  const [state, setState] = useState<'' | 'saving' | 'saved'>('');
  const [error, setError] = useState('');
  useEffect(() => {
    workingWeek.get(token).then((w) => { setWeeks(w); setDraft(w.org); }, () => setError(t`Couldn’t load the working week. Please refresh to try again.`));
  }, [token !== null]); // load once
  if (!weeks) return <p role={error ? 'alert' : 'status'} className="text-sm text-muted-foreground">{error || <Trans>Loading…</Trans>}</p>;
  async function save() {
    setState('saving');
    setError('');
    try {
      await workingWeek.setOrg(draft, token);
      const next = { ...weeks!, org: draft };
      setWeeks(next);
      setWorkingWeeks(next); // countdowns on this tab use it straight away
      setState('saved');
    } catch (e) {
      setError(e instanceof ApiError && e.status < 500 ? e.message : t`Couldn’t save the working week. Please try again.`);
      setState('');
    }
  }
  return (
    <div className="grid gap-4">
      <WorkingWeekNote />
      <WorkingWeekForm value={draft} onChange={(w) => { setDraft(w); setState(''); }} disabled={!admin} />
      {!admin && <p className="text-sm text-muted-foreground"><Trans>Only organization admins can change it.</Trans></p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {admin && (
        <div className="flex items-center gap-3">
          <Button disabled={state === 'saving' || !validWeek(draft) || same(draft, weeks.org)} onClick={() => void save()}>{state === 'saving' ? t`Saving…` : t`Save`}</Button>
          {state === 'saved' && <span role="status" className="text-sm text-muted-foreground"><Trans>Saved.</Trans></span>}
        </div>
      )}
    </div>
  );
}

// ProjectWorkingWeek: a project follows the organization's week, or has its own (set by those who manage it).
export function ProjectWorkingWeek({ token, projectId, canManage }: { token: string; projectId: string; canManage: boolean }) {
  const { t } = useT();
  const [weeks, setWeeks] = useState<WorkWeeks | null>(null);
  const [own, setOwn] = useState(false);
  const [draft, setDraft] = useState<WorkWeek>(DEFAULT_WEEK);
  const [state, setState] = useState<'' | 'saving' | 'saved'>('');
  const [error, setError] = useState('');
  useEffect(() => {
    workingWeek.get(token).then((w) => {
      setWeeks(w);
      setOwn(!!w.projects[projectId]);
      setDraft(w.projects[projectId] ?? w.org);
    }, () => setError(t`Couldn’t load the working week. Please refresh to try again.`));
  }, [token !== null, projectId]);
  if (!weeks) return <p role={error ? 'alert' : 'status'} className="text-sm text-muted-foreground">{error || <Trans>Loading…</Trans>}</p>;
  const had = weeks.projects[projectId];
  const changed = own ? !had || !same(draft, had) : !!had;
  async function save() {
    setState('saving');
    setError('');
    try {
      const projects = { ...weeks!.projects };
      if (own) {
        await workingWeek.setProject(projectId, draft, token);
        projects[projectId] = draft;
      } else {
        await workingWeek.resetProject(projectId, token);
        delete projects[projectId];
      }
      const next = { ...weeks!, projects };
      setWeeks(next);
      setWorkingWeeks(next);
      setState('saved');
    } catch (e) {
      setError(e instanceof ApiError && e.status < 500 ? e.message : t`Couldn’t save the working week. Please try again.`);
      setState('');
    }
  }
  return (
    <div className="grid gap-4">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={!own} disabled={!canManage} onCheckedChange={(on) => { setOwn(on !== true); if (on === true) setDraft(weeks.org); setState(''); }} />
        <Trans>Use the organization’s working week</Trans>
      </label>
      <WorkingWeekForm value={own ? draft : weeks.org} onChange={(w) => { setDraft(w); setState(''); }} disabled={!own || !canManage} />
      {!canManage && <p className="text-sm text-muted-foreground"><Trans>Only those who manage this project can change it.</Trans></p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {canManage && (
        <div className="flex items-center gap-3">
          <Button className="w-fit" disabled={state === 'saving' || !changed || (own && !validWeek(draft))} onClick={() => void save()}>{state === 'saving' ? t`Saving…` : t`Save`}</Button>
          {state === 'saved' && <span role="status" className="text-sm text-muted-foreground"><Trans>Saved.</Trans></span>}
        </div>
      )}
    </div>
  );
}

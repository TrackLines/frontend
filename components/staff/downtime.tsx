'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import type { I18n } from '@lingui/core';
import { useEffect, useState, type ReactNode } from 'react';
import { useAct } from '@/components/settings/jira-import';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { staff, type CreditPreview, type CreditResult, type DowntimeCredit, type Outage } from '@/lib/api';
import { dates } from '@/lib/i18n';
import { useToken } from '@/lib/hooks/use-token';
import { cn } from '@/lib/utils';

export const STATUS_PAGE = 'https://uptime.chewedfeed.com/status/tracklines';

// fromUTCInput: a datetime-local value, read as UTC (the status page's times), as RFC 3339; '' if blank.
export const fromUTCInput = (v: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? `${v}:00Z` : '');

// toCredit: the lines not credited yet, how many organizations they are, and the total per currency.
export function toCredit(lines: DowntimeCredit[]): { lines: DowntimeCredit[]; orgs: number; totals: Record<string, number> } {
  const open = lines.filter((l) => !l.credited);
  const totals: Record<string, number> = {};
  for (const l of open) totals[l.currency] = (totals[l.currency] ?? 0) + l.amount;
  return { lines: open, orgs: new Set(open.map((l) => l.org_id)).size, totals };
}

const TAGS: Record<string, string> = { en: 'en-GB', pt: 'pt-BR', tlh: 'en-GB' };
// money: minor units in the currency. ponytail: assumes two decimals (GBP, EUR, USD); Intl's digits if we ever bill in yen.
export const money = (i18n: I18n, minor: number, currency: string) =>
  new Intl.NumberFormat(TAGS[i18n.locale] ?? i18n.locale, { style: 'currency', currency: currency.toUpperCase() }).format(minor / 100);
const moneyList = (i18n: I18n, totals: Record<string, number>) => Object.entries(totals).map(([c, v]) => money(i18n, v, c)).join(' + ');
const day = (i18n: I18n, d: string) => dates(i18n, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));
const when = (i18n: I18n, iso: string) => dates(i18n, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(iso));

// StaffDowntime: the downtime resolver's manual phase (TL-580): record an outage, preview its credits, apply them.
export function StaffDowntime() {
  const token = useToken();
  const [list, setList] = useState<Outage[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const reload = () => { if (token) staff.outages(token).then(setList, () => setFailed(true)); };
  useEffect(reload, [token !== null]);
  if (failed) return <p role="alert" className="text-sm text-destructive"><Trans>Couldn’t load the outages.</Trans></p>;
  if (!list || !token) return <p role="status" className="text-sm text-muted-foreground"><Trans>Loading…</Trans></p>;
  const chosen = list.find((o) => o.id === open);
  return (
    <div className="grid gap-8">
      <RecordOutage token={token} onRecorded={(o) => { setList([o, ...list]); reload(); setOpen(o.id); }} />
      <OutageList list={list} open={open} onOpen={setOpen} onDelete={(o) => setList(list.filter((x) => x.id !== o.id))} token={token} />
      {chosen && <Credits key={chosen.id} outage={chosen} token={token} onApplied={reload} />}
    </div>
  );
}

function RecordOutage({ token, onRecorded }: { token: string; onRecorded: (o: Outage) => void }) {
  const { busy, error, act } = useAct();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const ready = fromUTCInput(from) !== '' && fromUTCInput(to) !== '';
  return (
    <section aria-labelledby="record-outage" className="grid gap-3 rounded-xl border p-4">
      <h2 id="record-outage" className="font-semibold"><Trans>Record an outage</Trans></h2>
      <p className="text-sm text-muted-foreground">
        <Trans>Times are UTC, as on the <a href={STATUS_PAGE} target="_blank" rel="noreferrer" className="underline">status page</a>. Over an hour makes every UTC day it touched free for every paying organization.</Trans>
      </p>
      <form className="grid gap-3 sm:grid-cols-[auto_auto_1fr_auto] sm:items-end" onSubmit={(e) => {
        e.preventDefault();
        void act(async () => {
          onRecorded(await staff.addOutage({ starts_at: fromUTCInput(from), ends_at: fromUTCInput(to), note }, token));
          setFrom(''); setTo(''); setNote('');
        });
      }}>
        <label className="grid gap-1 text-sm"><span className="font-medium"><Trans>Started (UTC)</Trans></span><Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} required /></label>
        <label className="grid gap-1 text-sm"><span className="font-medium"><Trans>Ended (UTC)</Trans></span><Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} required /></label>
        <label className="grid gap-1 text-sm"><span className="font-medium"><Trans>Note</Trans></span><Input value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <Button type="submit" disabled={busy || !ready}><Trans>Record</Trans></Button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

export function OutageList({ list, open, onOpen, onDelete, token }: { list: Outage[]; open: string | null; onOpen: (id: string) => void; onDelete: (o: Outage) => void; token: string }) {
  const { t, i18n } = useLingui();
  const { busy, error, act } = useAct();
  if (list.length === 0) return <p className="text-sm text-muted-foreground"><Trans>No outages recorded.</Trans></p>;
  return (
    <section aria-label={t`Outages`} className="grid gap-2">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Trans>From (UTC)</Trans></TableHead>
            <TableHead><Trans>To (UTC)</Trans></TableHead>
            <TableHead><Trans>Length</Trans></TableHead>
            <TableHead><Trans>Policy</Trans></TableHead>
            <TableHead><Trans>Credits</Trans></TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((o) => (
            <TableRow key={o.id} data-state={o.id === open ? 'selected' : undefined}>
              <TableCell>{when(i18n, o.starts_at)}{o.note && <span className="block text-xs text-muted-foreground">{o.note}</span>}</TableCell>
              <TableCell>{when(i18n, o.ends_at)}</TableCell>
              <TableCell className="tabular-nums">{Math.floor(o.minutes / 60) > 0 ? t`${Math.floor(o.minutes / 60)} h ${o.minutes % 60} min` : t`${o.minutes} min`}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {o.qualifies ? <Badge><Trans>Over an hour: credited</Trans></Badge> : <Badge variant="secondary"><Trans>An hour or less</Trans></Badge>}
                  {o.clusters.map((d) => <Badge key={d} variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400"><Trans>Cluster on {day(i18n, d)}: you decide</Trans></Badge>)}
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{o.credited}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" onClick={() => onOpen(o.id)}><Trans>Preview</Trans></Button>
                  {o.credited === 0 && (
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => {
                      if (window.confirm(t`Delete this outage? Only for one recorded by mistake.`)) void act(async () => { await staff.deleteOutage(o.id, token); onDelete(o); });
                    }}><Trans>Delete</Trans></Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function Credits({ outage, token, onApplied }: { outage: Outage; token: string; onApplied: () => void }) {
  const [preview, setPreview] = useState<CreditPreview | null>(null);
  const [failed, setFailed] = useState('');
  const [result, setResult] = useState<CreditResult | null>(null);
  const { t } = useLingui();
  const load = () => staff.previewCredits(outage.id, token).then(setPreview, (e: Error) => setFailed(e.message || t`Couldn’t work out the credits.`));
  useEffect(() => { void load(); }, [outage.id]);
  if (failed) return <p role="alert" className="text-sm text-destructive">{failed}</p>;
  if (!preview) return <p role="status" className="text-sm text-muted-foreground"><Trans>Working out the credits…</Trans></p>;
  return (
    <CreditsView preview={preview} result={result} onApply={async () => {
      const r = await staff.applyCredits(outage.id, !outage.qualifies, token);
      setResult(r);
      onApplied();
      await load();
    }} />
  );
}

// CreditsView: the outage's credits, already-credited days greyed, and Apply behind a confirmation.
export function CreditsView({ preview, result, onApply, confirming: startConfirming = false }: {
  preview: CreditPreview; result: CreditResult | null; onApply: () => Promise<void>; confirming?: boolean;
}) {
  const { i18n } = useLingui();
  const { busy, error, act } = useAct();
  const [confirming, setConfirming] = useState(startConfirming);
  const o = preview.outage;
  const due = toCredit(preview.credits);
  const days = o.days.map((d) => day(i18n, d)).join(', ');
  return (
    <section aria-labelledby="credits" className="grid gap-4 rounded-xl border p-4">
      <h2 id="credits" className="font-semibold"><Trans>Credits for {days}</Trans></h2>
      {!o.qualifies && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {o.clusters.length > 0
            ? <Trans>This outage was an hour or less, but it’s part of a cluster. Credit it only if you decide the cluster counts.</Trans>
            : <Trans>This outage was an hour or less, so the Terms don’t credit it.</Trans>}
        </p>
      )}
      {preview.credits.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>No paying organizations to credit.</Trans></p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Trans>Organization</Trans></TableHead>
              <TableHead><Trans>Plan</Trans></TableHead>
              <TableHead><Trans>Day (UTC)</Trans></TableHead>
              <TableHead className="text-right"><Trans>Credit</Trans></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.credits.map((l) => (
              <TableRow key={l.org_id + l.day} className={cn(l.credited && 'text-muted-foreground opacity-60')} data-credited={l.credited || undefined}>
                <TableCell className="font-mono text-xs">{l.org_id}</TableCell>
                <TableCell className="capitalize">{l.plan}</TableCell>
                <TableCell>{day(i18n, l.day)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(i18n, l.amount, l.currency)}{l.credited && <span className="ml-2 text-xs"><Trans>(already credited)</Trans></span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {preview.problems.length > 0 && <Problems title={<Trans>Couldn’t work these out</Trans>} list={preview.problems} />}
      {due.lines.length > 0 && (!o.qualifies && o.clusters.length === 0 ? null : (
        <div className="flex items-center gap-3">
          <Button onClick={() => setConfirming(true)} disabled={busy}><Trans>Apply credits</Trans></Button>
          <span className="text-sm text-muted-foreground"><Trans>{due.orgs} organizations, {moneyList(i18n, due.totals)} in total</Trans></span>
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {result && (
        <div className="grid gap-2 text-sm" role="status" data-result>
          <p><Trans>Credited {result.credited.length} organization-days.</Trans></p>
          {result.problems.length > 0 && <Problems title={<Trans>These failed: apply again to retry them</Trans>} list={result.problems} />}
        </div>
      )}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><Trans>Credit {due.orgs} organizations {moneyList(i18n, due.totals)} in total?</Trans></DialogTitle>
            <DialogDescription><Trans>Each gets a credit on their next Stripe bill for {days}, and their admins are told. A day is never credited twice.</Trans></DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)}><Trans>Cancel</Trans></Button>
            <Button disabled={busy} onClick={() => void act(async () => { await onApply(); setConfirming(false); })}><Trans>Credit them</Trans></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Problems({ title, list }: { title: ReactNode; list: { org_id: string; error: string }[] }) {
  return (
    <div className="grid gap-1 text-sm" role="alert">
      <p className="font-medium text-destructive">{title}</p>
      <ul className="list-disc pl-5 text-muted-foreground">
        {list.map((p, i) => <li key={i}><span className="font-mono text-xs">{p.org_id}</span>: {p.error}</li>)}
      </ul>
    </div>
  );
}

'use client';

import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { useAct } from '@/components/settings/jira-import';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { staff, type OfferOrg, type OfferSendResult, type OfferStatus } from '@/lib/api';
import { dates } from '@/lib/i18n';
import { useToken } from '@/lib/hooks/use-token';
import { PLAN_NAMES } from '@/lib/org/plans';

// The launch offer's admin page (TL-779): every organization, newest first, with where it is with the
// free year of Pro. Staff pick the ones to send it to, one or many; nobody gets it otherwise.

const STATUS = {
  not_sent: msg`Not sent`, sent: msg`Sent`, claimed: msg`Claimed`, converted: msg`Now paying`, ended: msg`Ended`, paid: msg`Already paying`,
} satisfies Record<OfferStatus, ReturnType<typeof msg>>;

const REASONS = { already_sent: msg`already sent`, paid: msg`already paying`, failed: msg`failed, try again` };

// selectable: only an org that hasn't been sent the offer and isn't paying can be sent it.
export const selectable = (o: OfferOrg) => o.status === 'not_sent';

const day = (i18n: I18n, iso: string) => dates(i18n, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

// statusDetail: when the status happened, for the table.
export function statusDetail(i18n: I18n, o: OfferOrg): string {
  if (o.status === 'sent' && o.offered_at) return i18n._(msg`on ${day(i18n, o.offered_at)}`);
  if ((o.status === 'claimed' || o.status === 'converted' || o.status === 'ended') && o.claimed_at) {
    const claimed = day(i18n, o.claimed_at);
    if (o.status === 'claimed' && o.trial_ends_at) return i18n._(msg`on ${claimed}, free until ${day(i18n, o.trial_ends_at)}`);
    return i18n._(msg`claimed on ${claimed}`);
  }
  return '';
}

export function StaffLaunchOffers() {
  const token = useToken();
  const [data, setData] = useState<{ organizations: OfferOrg[]; flag_on: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const reload = () => { if (token) staff.launchOffers(token).then(setData, () => setFailed(true)); };
  useEffect(reload, [token !== null]);
  if (failed) return <p role="alert" className="text-sm text-destructive"><Trans>Couldn’t load the organizations.</Trans></p>;
  if (!data || !token) return <p role="status" className="text-sm text-muted-foreground"><Trans>Loading…</Trans></p>;
  return <LaunchOffersView orgs={data.organizations} flagOn={data.flag_on}
    onSend={async (ids) => { const r = await staff.sendLaunchOffers(ids, token); reload(); return r; }} />;
}

export function LaunchOffersView({ orgs, flagOn, onSend, initialSelected = [], initialConfirming = false, initialResult = null }: {
  orgs: OfferOrg[]; flagOn: boolean; onSend: (ids: string[]) => Promise<OfferSendResult>;
  initialSelected?: string[]; initialConfirming?: boolean; initialResult?: OfferSendResult | null;
}) {
  const { t, i18n } = useLingui();
  const { busy, error, act } = useAct();
  const [filter, setFilter] = useState<OfferStatus | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [confirming, setConfirming] = useState(initialConfirming);
  const [result, setResult] = useState<OfferSendResult | null>(initialResult);
  const shown = orgs.filter((o) => filter === 'all' || o.status === filter);
  const pickable = shown.filter(selectable);
  const allPicked = pickable.length > 0 && pickable.every((o) => selected.has(o.org_id));
  const chosen = orgs.filter((o) => selected.has(o.org_id) && selectable(o));
  const toggle = (id: string, on: boolean) => setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const toggleAll = (on: boolean) => setSelected((s) => { const n = new Set(s); for (const o of pickable) { if (on) n.add(o.org_id); else n.delete(o.org_id); } return n; });
  const count = chosen.length;
  const filters = { all: t`All`, ...Object.fromEntries(Object.entries(STATUS).map(([k, m]) => [k, i18n._(m)])) } as Record<OfferStatus | 'all', string>;

  return (
    <section aria-labelledby="launch-offers" className="grid gap-4">
      <div>
        <h2 id="launch-offers" className="font-semibold"><Trans>Launch offer: a free year of Pro</Trans></h2>
        <p className="text-sm text-muted-foreground">
          <Trans>Choose who gets the offer. Each organization is sent it once: its admins can claim it from Settings, and its members are told an admin can. Organizations that are already paying can’t be sent it.</Trans>
        </p>
      </div>
      {!flagOn && <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400"><Trans>The launch-offer flag is off, so nothing can be sent yet. Turn it on in flags.gg first.</Trans></p>}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm"><Trans>Show</Trans>
          <Select value={filter} onValueChange={(v) => { if (v) setFilter(v as OfferStatus | 'all'); }} items={filters}>
            <SelectTrigger className="w-44" aria-label={t`Show`}><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(filters).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <Button className="ml-auto" disabled={!flagOn || count === 0 || busy} onClick={() => setConfirming(true)}>
          {count === 1 ? <Trans>Send offer to 1 organization</Trans> : <Trans>Send offer to {count} organizations</Trans>}
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {result && (
        <div role="status" data-result className="grid gap-1 rounded-lg border p-3 text-sm">
          <p><Trans>Sent to {result.sent.length} organizations.</Trans></p>
          {result.skipped.length > 0 && (
            <ul className="text-muted-foreground">
              {result.skipped.map((s) => <li key={s.org_id}>{orgs.find((o) => o.org_id === s.org_id)?.name ?? s.org_id}: {i18n._(REASONS[s.reason] ?? REASONS.failed)}</li>)}
            </ul>
          )}
        </div>
      )}
      {shown.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>No organizations here.</Trans></p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"><Checkbox aria-label={t`Select all that can be sent`} checked={allPicked} disabled={pickable.length === 0} onCheckedChange={(v) => toggleAll(v === true)} /></TableHead>
              <TableHead><Trans>Organization</Trans></TableHead>
              <TableHead><Trans>Created</Trans></TableHead>
              <TableHead><Trans>Last active</Trans></TableHead>
              <TableHead className="text-right"><Trans>Members</Trans></TableHead>
              <TableHead><Trans>Plan</Trans></TableHead>
              <TableHead><Trans>Offer</Trans></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((o) => (
              <TableRow key={o.org_id} data-status={o.status}>
                <TableCell>
                  <Checkbox aria-label={t`Select ${o.name}`} checked={selected.has(o.org_id) && selectable(o)} disabled={!selectable(o)}
                    onCheckedChange={(v) => toggle(o.org_id, v === true)} />
                </TableCell>
                <TableCell><span className="font-medium">{o.name || o.org_id}</span><span className="block font-mono text-xs text-muted-foreground">{o.org_id}</span></TableCell>
                <TableCell>{day(i18n, o.created_at)}</TableCell>
                <TableCell>{o.last_active ? day(i18n, o.last_active) : <span className="text-muted-foreground"><Trans>Never</Trans></span>}</TableCell>
                <TableCell className="text-right tabular-nums">{o.members}</TableCell>
                <TableCell>{PLAN_NAMES[o.plan]}</TableCell>
                <TableCell>
                  <Badge variant={o.status === 'claimed' || o.status === 'converted' ? 'default' : o.status === 'not_sent' ? 'outline' : 'secondary'}>{i18n._(STATUS[o.status])}</Badge>
                  {statusDetail(i18n, o) && <span className="ml-2 text-xs text-muted-foreground">{statusDetail(i18n, o)}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{count === 1 ? <Trans>Send the offer to 1 organization?</Trans> : <Trans>Send the offer to {count} organizations?</Trans>}</DialogTitle>
            <DialogDescription>
              <Trans>Their admins and members are told now, in the app and on their devices. Each organization can only be sent it once, and this can’t be undone.</Trans>
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-48 overflow-auto text-sm">{chosen.map((o) => <li key={o.org_id}>{o.name || o.org_id}</li>)}</ul>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)}><Trans>Cancel</Trans></Button>
            <Button disabled={busy || count === 0} onClick={() => void act(async () => {
              setResult(await onSend(chosen.map((o) => o.org_id)));
              setSelected(new Set());
              setConfirming(false);
            })}><Trans>Send it</Trans></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

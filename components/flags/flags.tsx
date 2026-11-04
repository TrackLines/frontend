'use client';

import type { I18n, MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { FlagIcon } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, flags, type FlagAction, type FlagsStatus, type ProjectFlags, type Ticket, type TicketFlag } from '@/lib/api';

// flags.gg (TL-790, TL-791): a ticket that needs a feature flag gets one in flags.gg when it reaches a
// board; columns promote it through the environments; "Remove flag" archives it once the code no longer
// checks it. The org connects with an integration token, each project picks the agent its flags go in.

export const FLAG_ACTIONS: Record<FlagAction, MessageDescriptor> = {
  none: msg`Nothing`,
  promote: msg`Promote to the next environment`,
  promote_to_production: msg`Promote to production`,
  archive: msg`Archive the flag`,
};

// flagError says what went wrong talking to flags.gg, in words someone can act on.
export function flagError(i18n: I18n, err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  if (err.status === 403) return i18n._(msg`Only organization admins can change this.`);
  if (err.status === 503) return i18n._(msg`Integrations aren’t set up on this server yet.`);
  return err.message || fallback;
}

// FlagsSettings: the org's flags.gg connection, under Settings → Integrations. Admins connect and
// disconnect; everyone sees whether it's connected and the applications it can reach.
export function FlagsSettings({ token, canManage }: { token: string; canManage: boolean }) {
  const { t, i18n } = useLingui();
  const [status, setStatus] = useState<FlagsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = () => flags.status(token).then(setStatus, () => setStatus({ provider: 'flags', connected: false }));
  useEffect(() => { void load(); }, []); // token refreshes must not refetch
  async function run(action: () => Promise<unknown>, failed: string) {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
    } catch (err) {
      setError(flagError(i18n, err, failed));
    } finally {
      setBusy(false);
    }
  }
  return (
    <FlagsSettingsView status={status} canManage={canManage} busy={busy} error={error}
      onConnect={(key) => run(() => flags.connect({ token: key }, token), t`Couldn’t connect flags.gg.`)}
      onDisconnect={() => confirm(t`Disconnect flags.gg? Tickets’ flags stop following them until it’s connected again.`) && run(() => flags.disconnect(token), t`Couldn’t disconnect flags.gg.`)} />
  );
}

export function FlagsSettingsView({ status, canManage, busy, error, onConnect, onDisconnect }: {
  status: FlagsStatus | null; canManage: boolean; busy: boolean; error: string; onConnect: (token: string) => void; onDisconnect: () => void;
}) {
  const { t } = useLingui();
  const [value, setValue] = useState('');
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (value.trim()) onConnect(value.trim());
  }
  return (
    <section aria-label="flags.gg" className="grid gap-3 rounded-xl border p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-lg font-semibold"><FlagIcon className="size-4" aria-hidden /> flags.gg</h2>
        {status === null ? <Badge variant="secondary"><Trans>Checking…</Trans></Badge>
          : status.connected ? <Badge><Trans>Connected</Trans></Badge> : <Badge variant="outline"><Trans>Not connected</Trans></Badge>}
        {canManage && status?.connected && <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={busy} onClick={onDisconnect}><Trans>Disconnect</Trans></Button>}
      </div>
      <p className="text-sm text-muted-foreground">
        <Trans>A ticket that needs a feature flag gets one in flags.gg when it goes onto a board, off at first. Columns promote it through your environments as the ticket moves, and once it reaches production a “Remove flag” ticket reminds the team to take it out of the code.</Trans>
      </p>
      {status?.connected && status.agents && (
        <ul aria-label={t`Applications this token can reach`} className="divide-y rounded-lg border">
          {status.agents.map((a) => (
            <li key={a.agent_id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span className="font-medium">{a.project_name} · {a.agent_name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{a.environments.map((e) => e.name).join(' → ')}</span>
            </li>
          ))}
        </ul>
      )}
      {status?.agents_error && <p className="text-sm text-muted-foreground"><Trans>flags.gg couldn’t list its applications just now.</Trans></p>}
      {canManage && (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm font-medium">
            <span>{status?.connected ? <Trans>Replace integration token</Trans> : <Trans>Integration token</Trans>}</span>
            <Input type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t`flg_… from flags.gg → Company → Integrations`} />
          </label>
          <Button type="submit" disabled={busy || !value.trim()}>{busy ? <Trans>Saving…</Trans> : status?.connected ? <Trans>Update</Trans> : <Trans>Connect</Trans>}</Button>
          <p className="text-xs text-muted-foreground sm:col-span-2"><Trans>It’s checked with flags.gg, stored encrypted and never shown again. Connect a flags.gg company to one organization only: flags are named after ticket keys.</Trans></p>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

// ProjectFlagsSettings: which flags.gg application this project's tickets' flags go in, and how long after
// production the "Remove flag" ticket is due (Edit project → Integrations).
export function ProjectFlagsSettings({ token, projectId, canManage }: { token: string; projectId: string; canManage: boolean }) {
  const { t, i18n } = useLingui();
  const [status, setStatus] = useState<FlagsStatus | null>(null);
  const [settings, setSettings] = useState<ProjectFlags | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    flags.status(token).then(setStatus, () => setStatus({ provider: 'flags', connected: false }));
    flags.project(projectId, token).then(setSettings, () => setSettings({ agent_id: null, cleanup_days: 30 }));
  }, [projectId]); // token refreshes must not refetch
  async function save(input: { agent_id: string; cleanup_days: number }) {
    setBusy(true);
    setNote(null);
    try {
      setSettings(await flags.setProject(projectId, input, token));
      setNote({ ok: true, text: t`Saved.` });
    } catch (err) {
      setNote({ ok: false, text: flagError(i18n, err, t`Couldn’t save. Please try again.`) });
    } finally {
      setBusy(false);
    }
  }
  return <ProjectFlagsView status={status} settings={settings} canManage={canManage} busy={busy} note={note} onSave={save} />;
}

export function ProjectFlagsView({ status, settings, canManage, busy, note, onSave }: {
  status: FlagsStatus | null; settings: ProjectFlags | null; canManage: boolean; busy: boolean; note: { ok: boolean; text: string } | null;
  onSave: (input: { agent_id: string; cleanup_days: number }) => void;
}) {
  const { t } = useLingui();
  const [agent, setAgent] = useState(settings?.agent_id ?? '');
  const [days, setDays] = useState(String(settings?.cleanup_days ?? 30));
  useEffect(() => { setAgent(settings?.agent_id ?? ''); setDays(String(settings?.cleanup_days ?? 30)); }, [settings]);
  if (status === null || settings === null) return <Skeleton role="status" aria-label={t`Loading…`} className="h-10 w-full" />;
  if (!status.connected) return <p className="text-sm text-muted-foreground"><Trans>Connect flags.gg under Settings → Integrations first. Then pick the application this project’s flags go in.</Trans></p>;
  const agents = status.agents ?? [];
  const items = Object.fromEntries(agents.map((a) => [a.agent_id, `${a.project_name} · ${a.agent_name}`]));
  const n = Number(days);
  const valid = Number.isInteger(n) && n >= 1 && n <= 365;
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (valid) onSave({ agent_id: agent, cleanup_days: n }); }}>
      <label className="grid gap-1.5 text-sm font-medium">
        <Trans>Application</Trans>
        <Select items={items} value={agent || null} onValueChange={(v) => setAgent(v ?? '')} disabled={!canManage}>
          <SelectTrigger aria-label={t`Application`} className="w-full max-w-md"><SelectValue placeholder={t`Choose where this project’s flags go`} /></SelectTrigger>
          <SelectContent>{agents.map((a) => <SelectItem key={a.agent_id} value={a.agent_id}>{items[a.agent_id]}</SelectItem>)}</SelectContent>
        </Select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        <Trans>“Remove flag” ticket due after (days in production)</Trans>
        <Input type="number" min={1} max={365} value={days} disabled={!canManage} onChange={(e) => setDays(e.target.value)} className="w-28" aria-invalid={!valid} />
      </label>
      {canManage && <Button type="submit" className="justify-self-start" disabled={busy || !valid || !agent}>{busy ? <Trans>Saving…</Trans> : <Trans>Save</Trans>}</Button>}
      {note && <p role={note.ok ? 'status' : 'alert'} className={`text-sm ${note.ok ? 'text-muted-foreground' : 'text-destructive'}`}>{note.text}</p>}
    </form>
  );
}

// NeedsFlagField: on a ticket's form, whether it needs a flag and what the flag is called (until flags.gg
// has it: then the name is locked).
export function NeedsFlagField({ needs, name, placeholder, locked, onNeeds, onName }: {
  needs: boolean; name: string; placeholder: string; locked: boolean; onNeeds: (v: boolean) => void; onName: (v: string) => void;
}) {
  const { t } = useLingui();
  return (
    <div className="grid gap-2 text-sm">
      <label className="flex items-center gap-2 font-medium">
        <Checkbox checked={needs} onCheckedChange={(v) => onNeeds(v === true)} />
        <Trans>Needs a feature flag</Trans>
      </label>
      {needs && (
        <label className="grid gap-1.5 font-medium">
          <span><Trans>Flag name <span className="font-normal text-muted-foreground">(what the code checks)</span></Trans></span>
          <Input value={name} placeholder={placeholder} maxLength={100} disabled={locked} onChange={(e) => onName(e.target.value)}
            aria-describedby={locked ? 'flag-name-locked' : undefined} className="max-w-sm font-mono" />
          {locked && <span id="flag-name-locked" className="text-xs font-normal text-muted-foreground">{t`flags.gg has this flag, so its name can’t change.`}</span>}
        </label>
      )}
    </div>
  );
}

// TicketFlagPanel: a ticket's flag in each environment, read from flags.gg each time it opens; switch it on
// or off where it has arrived, or remove it once the code no longer checks it.
export function TicketFlagPanel({ ticket, token, onRemoved }: { ticket: Pick<Ticket, 'id' | 'needs_flag' | 'flag_name' | 'flag_error'>; token: string; onRemoved?: () => void }) {
  const { t, i18n } = useLingui();
  const [flag, setFlag] = useState<TicketFlag | null | 'none'>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!ticket.needs_flag) return;
    flags.ticket(ticket.id, token).then(setFlag, (err) => {
      setFlag('none');
      if (!(err instanceof ApiError && err.status === 404)) setError(flagError(i18n, err, t`Couldn’t load the flag from flags.gg.`));
    });
  }, [ticket.id, ticket.needs_flag]); // token refreshes must not refetch
  if (!ticket.needs_flag) return null;
  async function run(action: () => Promise<TicketFlag | void>, failed: string) {
    setBusy(true);
    setError('');
    try {
      const next = await action();
      if (next) setFlag(next);
    } catch (err) {
      setError(flagError(i18n, err, failed));
    } finally {
      setBusy(false);
    }
  }
  return (
    <TicketFlagView name={ticket.flag_name ?? ''} flag={flag} problem={ticket.flag_error ?? ''} error={error} busy={busy}
      onToggle={(env, on) => run(() => flags.toggle(ticket.id, env, on, token), t`Couldn’t change the flag.`)}
      onRemove={() => confirm(t`Remove this flag? Code must no longer check it: it’s archived in flags.gg in every environment.`) &&
        run(async () => { await flags.remove(ticket.id, token); onRemoved?.(); }, t`Couldn’t remove the flag.`)} />
  );
}

export function TicketFlagView({ name, flag, problem, error, busy, onToggle, onRemove }: {
  name: string; flag: TicketFlag | null | 'none'; problem: string; error: string; busy: boolean;
  onToggle: (environmentId: string, on: boolean) => void; onRemove: () => void;
}) {
  const { t } = useLingui();
  return (
    <section aria-label={t`Feature flag`} className="grid gap-2 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-1.5 font-semibold"><FlagIcon className="size-4" aria-hidden /> <Trans>Feature flag</Trans></h2>
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{name}</code>
        {flag !== null && flag !== 'none' && <Button type="button" size="sm" variant="ghost" className="ml-auto text-destructive" disabled={busy} onClick={onRemove}><Trans>Remove flag</Trans></Button>}
      </div>
      {problem && <p role="alert" className="text-destructive">{problem}</p>}
      {flag === null ? <Skeleton role="status" aria-label={t`Loading the flag…`} className="h-8 w-full" />
        : flag === 'none' ? <p className="text-muted-foreground"><Trans>flags.gg makes the flag, off, when this ticket goes onto a board.</Trans></p>
        : (
          <ul className="grid gap-1">
            {flag.environments.map((e) => (
              <li key={e.environment_id} className="flex items-center gap-2">
                <span className="w-28 truncate font-medium">{e.name}</span>
                {e.present ? (
                  <label className="flex items-center gap-2">
                    <Checkbox checked={e.enabled} disabled={busy} onCheckedChange={(v) => onToggle(e.environment_id, v === true)} aria-label={t`On in ${e.name}`} />
                    {e.enabled ? <Trans>On</Trans> : <Trans>Off</Trans>}
                  </label>
                ) : <span className="text-muted-foreground"><Trans>Not yet</Trans></span>}
              </li>
            ))}
          </ul>
        )}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </section>
  );
}

// useFlagsConnected: whether the org has connected flags.gg, asked once per page load (forms only offer
// "Needs a feature flag" when it has).
let connected: Promise<boolean> | null = null;
export function useFlagsConnected(token: string | null): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!token) return;
    connected ??= flags.status(token).then((s) => s.connected, () => { connected = null; return false; });
    let live = true;
    void connected.then((v) => { if (live) setOn(v); });
    return () => { live = false; };
  }, [token !== null]);
  return on;
}

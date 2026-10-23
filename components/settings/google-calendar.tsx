'use client';

import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState, type FormEvent } from 'react';
import { CopyButton } from '@/components/copy-link';
import { When } from '@/components/when';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, googleCalendar, type CalendarStatus } from '@/lib/api';

// Google's admin console page where a Workspace admin lets our service account read calendars.
export const DELEGATION_URL = 'https://admin.google.com/ac/owl/domainwidedelegation';
export const UK_HOLIDAYS = 'en.uk#holiday@group.v.calendar.google.com';

// calendarError: the server's reason (it says what to fix in Google), else a fallback.
export const calendarError = (i18n: I18n, err: unknown, fallback: string) =>
  err instanceof ApiError && [400, 409, 502, 503].includes(err.status) && err.message ? err.message
    // 403: not an admin, or (audit) no verified address of their own at the domain, which says so
    : err instanceof ApiError && err.status === 403 ? (err.message.includes('verify your own') ? err.message : i18n._(msg`Only organization admins can change this.`)) : fallback;

type Busy = 'connect' | 'test' | 'sync' | 'remove' | null;

// GoogleCalendarSettings: Google Calendar in Settings → Integrations → Calendars (TL-409).
export function GoogleCalendarSettings({ token, canManage }: { token: string; canManage: boolean }) {
  const { t, i18n } = useLingui();
  const [status, setStatus] = useState<CalendarStatus | null | 'off'>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // any failure hides the card rather than half-showing it
  const load = () => googleCalendar.get(token).then(setStatus, () => setStatus('off'));
  useEffect(() => { void load(); }, []); // token refreshes must not refetch

  async function run(what: Busy, action: () => Promise<unknown>, done: string, failed: string) {
    setBusy(what);
    setMessage('');
    setError('');
    try {
      await action();
      await load();
      setMessage(done);
    } catch (err) {
      setError(calendarError(i18n, err, failed));
    } finally {
      setBusy(null);
    }
  }
  if (status === 'off') return null; // the flag is off (404), or it couldn't load
  return (
    <GoogleCalendarView status={status} canManage={canManage} busy={busy} message={message} error={error}
      onConnect={(input) => run('connect', () => googleCalendar.connect(input, token), t`Connected. People’s time away is syncing now.`, t`Couldn’t connect. Please try again.`)}
      onTest={() => run('test', () => googleCalendar.test(token), t`Google still lets TrackLin.es read your calendars.`, t`Couldn’t check the connection.`)}
      onSync={() => run('sync', async () => {
        const c = await googleCalendar.sync(token);
        if (c.last_sync_error) throw new ApiError(400, c.last_sync_error);
      }, t`Synced.`, t`Couldn’t sync. Please try again.`)}
      onRemove={() => confirm(t`Disconnect Google Calendar? Everyone’s time away is deleted from TrackLin.es, and nobody shows as on holiday until it’s connected again.`) &&
        run('remove', () => googleCalendar.remove(token), t`Disconnected.`, t`Couldn’t disconnect.`)} />
  );
}

type ViewProps = {
  status: CalendarStatus | null; canManage: boolean; busy: Busy; message: string; error: string;
  onConnect: (input: { domain: string; admin_email: string; holidays_calendar?: string }) => void;
  onTest: () => void; onSync: () => void; onRemove: () => void;
};

// GoogleCalendarView: pure, for tests.
export function GoogleCalendarView({ status, canManage, busy, message, error, onConnect, onTest, onSync, onRemove }: ViewProps) {
  const c = status?.connection;
  return (
    <section aria-label="Google Calendar" className="grid gap-3 rounded-xl border p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Google Calendar</h2>
        {status === null ? <Badge variant="secondary"><Trans>Checking…</Trans></Badge>
          : status.connected ? <Badge>{c ? <Trans>Connected to {c.domain}</Trans> : <Trans>Connected</Trans>}</Badge> : <Badge variant="outline"><Trans>Not connected</Trans></Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        <Trans>Shows who’s on holiday, from their Out of office events in Google Calendar: in the assignee picker, on their tickets and in standup.
        Only the dates are kept, never what the event says.</Trans>
      </p>
      {status && !status.available && canManage && <p className="text-sm text-muted-foreground"><Trans>Google Calendar isn’t set up on this server.</Trans></p>}
      {status?.available && !status.connected && (canManage
        ? <ConnectForm status={status} busy={busy} onConnect={onConnect} />
        : <p className="text-sm text-muted-foreground"><Trans>An organization admin can connect your Google Workspace here.</Trans></p>)}
      {status?.connected && c && (
        <div className="grid gap-2 text-sm">
          <p>
            <span className="text-muted-foreground"><Trans>Last synced:</Trans></span>{' '}
            {c.last_sync_at ? <When iso={c.last_sync_at} /> : <Trans>not yet</Trans>}
            {c.holidays_calendar && <> · <span className="text-muted-foreground"><Trans>Company days off from</Trans></span> <code className="rounded bg-muted px-1">{c.holidays_calendar}</code></>}
          </p>
          {c.last_sync_error && <p role="alert" className="text-destructive">{c.last_sync_error}</p>}
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={!!busy} onClick={onSync}>{busy === 'sync' ? <Trans>Syncing…</Trans> : <Trans>Sync now</Trans>}</Button>
              <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={onTest}>{busy === 'test' ? <Trans>Checking…</Trans> : <Trans>Test connection</Trans>}</Button>
              <Button type="button" size="sm" variant="ghost" className="ml-auto text-destructive" disabled={!!busy} onClick={onRemove}><Trans>Disconnect</Trans></Button>
            </div>
          )}
        </div>
      )}
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

// ConnectForm: first let us in, in Google; then the domain and an admin to check it with.
function ConnectForm({ status, busy, onConnect }: { status: CalendarStatus; busy: Busy; onConnect: ViewProps['onConnect'] }) {
  const { t } = useLingui();
  const [domain, setDomain] = useState('');
  const [admin, setAdmin] = useState('');
  const [holidays, setHolidays] = useState('');
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onConnect({ domain: domain.trim(), admin_email: admin.trim(), holidays_calendar: holidays.trim() || undefined });
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <ol className="grid list-decimal gap-3 pl-5 text-sm">
        <li>
          <p>
            <Trans>In Google, as a Workspace admin, open{' '}
            <a href={DELEGATION_URL} target="_blank" rel="noreferrer" className="underline">Security → Access and data control → API controls → Manage Domain Wide Delegation</a>{' '}
            (you need to be a super admin), choose <strong>Add new</strong> and paste:</Trans>
          </p>
          <div className="mt-2 grid gap-2">
            <Copyable label={t`Client ID`} value={status.client_id ?? ''} />
            <Copyable label={t`OAuth scopes`} value={status.scope} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground"><Trans>This lets TrackLin.es read calendars, nothing else. It can take a few minutes to apply.</Trans></p>
        </li>
        <li className="grid gap-3">
          <p><Trans>Then tell us your Workspace:</Trans></p>
          <label className="grid gap-1.5 font-medium">
            <Trans>Workspace domain</Trans>
            <Input required placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </label>
          <label className="grid gap-1.5 font-medium">
            <span><Trans>Admin email <span className="font-normal text-muted-foreground">(a user in that domain, to check access with)</span></Trans></span>
            <Input required type="email" placeholder={`you@${domain.trim() || 'example.com'}`} value={admin} onChange={(e) => setAdmin(e.target.value)} />
          </label>
          <label className="grid gap-1.5 font-medium">
            <span><Trans>Company days off <span className="font-normal text-muted-foreground">(optional: a shared calendar’s ID)</span></Trans></span>
            <Input placeholder={UK_HOLIDAYS} value={holidays} onChange={(e) => setHolidays(e.target.value)} />
            <span className="text-xs font-normal text-muted-foreground">
              <Trans>Everyone shows as off on its all-day events. Your own shared calendar, or a public one like{' '}
              <button type="button" className="underline" onClick={() => setHolidays(UK_HOLIDAYS)}>UK bank holidays</button>.</Trans>
            </span>
          </label>
        </li>
      </ol>
      <div>
        <Button type="submit" disabled={!!busy || !domain.trim() || !admin.trim()}>{busy === 'connect' ? <Trans>Checking with Google…</Trans> : <Trans>Connect</Trans>}</Button>
      </div>
    </form>
  );
}

function Copyable({ label, value }: { label: string; value: string }) {
  const { t } = useLingui();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs">{value}</code>
      <CopyButton value={value} label={t`Copy`} size="sm" ariaLabel={t`Copy ${label}`} />
    </div>
  );
}

'use client';

import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoogleCalendarSettings } from '@/components/settings/google-calendar';
import { GoogleChatSettings } from '@/components/settings/google-chat';
import { integrations, organization, type IntegrationProvider, type IntegrationStatus } from '@/lib/api';
import { integrationError, PROVIDER_NAMES } from '@/lib/integrations';

const ABOUT: Record<IntegrationProvider, MessageDescriptor> = {
  bugfixes: msg`Bug tickets Bugfixes creates show the crash report’s live details: occurrences, last seen, where, and whether it came back.`,
  github: msg`Link repositories to projects. Pull requests that mention a ticket’s key (e.g. TL-123) show on the ticket, and merging one closes it. Connect each GitHub organization your projects’ repositories live in.`,
  bitbucket: msg`Link repositories to projects. Pull requests that mention a ticket’s key (e.g. TL-123) show on the ticket, and merging one closes it.`,
};

// INTEGRATION_TABS: the integrations, grouped by what they do (TL-389). A new one goes in its group,
// or a new group, so the page stays tidy as more are added.
export const INTEGRATION_TABS: { id: string; name: MessageDescriptor; items: (IntegrationProvider | 'google-chat' | 'google-calendar')[] }[] = [
  { id: 'repositories', name: msg`Repositories`, items: ['github', 'bitbucket'] },
  { id: 'communication', name: msg`Communication`, items: ['google-chat'] },
  { id: 'reporting', name: msg`Reporting`, items: ['bugfixes'] },
  { id: 'calendars', name: msg`Calendars`, items: ['google-calendar'] }, // who's on holiday (TL-409)
];

// IntegrationsSettings: the org's connections to other tools, in tabs (Repositories first). Org admins connect and disconnect;
// everyone else sees what's connected.
export function IntegrationsSettings({ token }: { token: string }) {
  const { i18n } = useLingui();
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    organization.me(token).then((r) => setAdmin(r.admin), () => setAdmin(false));
  }, []); // token refreshes must not refetch
  return (
    <div className="grid gap-6">
      {admin === false && <p role="note" className="text-sm text-muted-foreground"><Trans>Organization admins connect integrations. You can see what&apos;s connected.</Trans></p>}
      <Tabs defaultValue={INTEGRATION_TABS[0].id} className="gap-4">
        <TabsList>
          {INTEGRATION_TABS.map((tab) => <TabsTrigger key={tab.id} value={tab.id}>{i18n._(tab.name)}</TabsTrigger>)}
        </TabsList>
        {INTEGRATION_TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="grid gap-6">
            {tab.items.map((item) => item === 'google-calendar' ? <GoogleCalendarSettings key={item} token={token} canManage={admin === true} />
              : item === 'google-chat' ? (
              <section key={item} aria-label="Google Chat" className="grid gap-3 rounded-xl border p-5">
                <h2 className="text-lg font-semibold">Google Chat</h2>
                <p className="text-sm text-muted-foreground"><Trans>Post notifications for every project into one Google Chat space. A project can have its own space too, under Edit project.</Trans></p>
                <GoogleChatSettings token={token} canManage={admin === true} />
              </section>
            ) : <ProviderCard key={item} provider={item} token={token} canManage={admin === true} />)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ProviderCard({ provider, token, canManage }: { provider: IntegrationProvider; token: string; canManage: boolean }) {
  const { t, i18n } = useLingui();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = () => integrations.status(provider, token).then(setStatus, (err) => {
    setStatus({ provider, connected: false });
    setError(integrationError(i18n, err, t`Couldn’t load the connection.`));
  });
  useEffect(() => { void load(); }, []); // token refreshes must not refetch

  async function run(action: () => Promise<unknown>, failed: string) {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
    } catch (err) {
      setError(integrationError(i18n, err, failed));
    } finally {
      setBusy(false);
    }
  }

  const name = PROVIDER_NAMES[provider];
  const connect = provider === 'bugfixes' ? undefined : () => run(async () => {
    const { url } = await integrations.connectURL(provider, token);
    window.location.assign(url); // the provider sends the admin back to /settings/integrations/<provider>
  }, t`Couldn’t start connecting ${name}.`);
  // GitHub: one account at a time (installation); its repos' PRs stop linking until it's connected again
  const disconnect = (installation?: string, account?: string) => confirm(account
    ? t`Disconnect the GitHub account ${account}? Pull requests from its repositories stop linking to tickets until it's connected again.`
    : t`Disconnect ${name}? Its details stop showing until it's connected again.`) &&
    run(() => integrations.disconnect(provider, token, installation), t`Couldn’t disconnect ${account ?? name}.`);

  return (
    <ProviderCardView provider={provider} status={status} canManage={canManage} busy={busy} error={error} onConnect={connect} onDisconnect={disconnect}>
      {provider === 'bugfixes' && canManage && (
        <BugfixesTokenForm busy={busy} connected={!!status?.connected}
          onSave={(key, base) => run(() => integrations.connect('bugfixes', { token: key, ...(base && { base_url: base }) }, token), t`Couldn’t connect Bugfixes.`)} />
      )}
    </ProviderCardView>
  );
}

// ProviderCardView: one provider's status and actions (pure, for tests).
export function ProviderCardView({ provider, status, canManage, busy, error, onConnect, onDisconnect, children }: {
  provider: IntegrationProvider; status: IntegrationStatus | null; canManage: boolean; busy: boolean; error: string;
  onConnect?: () => void; onDisconnect: (installation?: string, account?: string) => void; children?: ReactNode;
}) {
  const { t, i18n } = useLingui();
  const name = PROVIDER_NAMES[provider];
  // GitHub connects several accounts (TL-281): each project links repos from whichever owns them
  const accounts = provider === 'github' ? status?.accounts ?? [] : [];
  return (
    <section aria-label={name} className="grid gap-3 rounded-xl border p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{name}</h2>
        {status === null ? <Badge variant="secondary"><Trans>Checking…</Trans></Badge>
          : status.connected ? <Badge>{accounts.length === 0 && status.account ? <Trans>Connected as {status.account}</Trans> : <Trans>Connected</Trans>}</Badge>
          : <Badge variant="outline"><Trans>Not connected</Trans></Badge>}
        {canManage && status?.connected && accounts.length === 0 && (
          <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={busy} onClick={() => onDisconnect()}><Trans>Disconnect</Trans></Button>
        )}
        {canManage && accounts.length > 0 && onConnect && (
          <Button size="sm" variant="outline" className="ml-auto" disabled={busy} onClick={onConnect}>{busy ? <Trans>Opening…</Trans> : <Trans>Add another GitHub account</Trans>}</Button>
        )}
        {canManage && status && !status.connected && onConnect && (
          <Button size="sm" className="ml-auto" disabled={busy} onClick={onConnect}>{busy ? <Trans>Opening…</Trans> : <Trans>Connect {name}</Trans>}</Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{i18n._(ABOUT[provider])}</p>
      {accounts.length > 0 && (
        <ul aria-label={t`Connected GitHub accounts`} className="divide-y rounded-lg border">
          {accounts.map((a) => (
            <li key={a.installation_id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="font-medium">{a.account}</span>
              {canManage && <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={busy} onClick={() => onDisconnect(a.installation_id, a.account)}><Trans>Disconnect</Trans></Button>}
            </li>
          ))}
        </ul>
      )}
      {provider === 'bitbucket' && status?.connected && status.workspaces && (
        // one person's connection reaches every workspace they're in (TL-286); disconnect is for all of it
        <div className="grid gap-2">
          <p className="text-xs text-muted-foreground">{status.account
            ? <Trans>Access comes from {status.account}’s Bitbucket account: repositories in any of these workspaces can be linked.</Trans>
            : <Trans>Access comes from one person’s Bitbucket account: repositories in any of these workspaces can be linked.</Trans>}</p>
          {status.workspaces.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>That account isn’t in any Bitbucket workspaces.</Trans></p> : (
            <ul aria-label={t`Bitbucket workspaces`} className="divide-y rounded-lg border">
              {status.workspaces.map((w) => <li key={w.slug} className="px-3 py-2 text-sm font-medium">{w.name}</li>)}
            </ul>
          )}
        </div>
      )}
      {children}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

// BugfixesTokenForm: Bugfixes connects with an access token from its own settings.
export function BugfixesTokenForm({ busy, connected, onSave }: { busy: boolean; connected: boolean; onSave: (token: string, baseURL: string) => void }) {
  const { t } = useLingui();
  const [value, setValue] = useState('');
  const [base, setBase] = useState('');
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (value.trim()) onSave(value.trim(), base.trim());
  }
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="grid gap-1.5 text-sm font-medium">
        <span>{connected ? <Trans>Replace access token</Trans> : <Trans>Access token</Trans>}</span>
        <Input type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t`From Bugfixes → Settings → Access tokens`} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        <span><Trans>API URL <span className="font-normal text-muted-foreground">(optional)</span></Trans></span>
        <Input value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://api.bugfix.es" />
      </label>
      <Button type="submit" disabled={busy || !value.trim()}>{busy ? <Trans>Saving…</Trans> : connected ? <Trans>Update</Trans> : <Trans>Connect</Trans>}</Button>
      <p className="text-xs text-muted-foreground sm:col-span-3"><Trans>A viewer-role token is enough. It’s stored encrypted and never shown again.</Trans></p>
    </form>
  );
}

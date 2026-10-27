'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { integrations, projectRepos, type GitRepo, type ProjectRepo } from '@/lib/api';
import { PROVIDER_NAMES, connectHint, GIT_PROVIDERS, integrationError } from '@/lib/org/integrations';

type GitProvider = ProjectRepo['provider'];

// ProjectRepositories: repos linked to the project. Pull requests in them that mention a ticket's
// key show on the ticket (and merging closes it). Admins link from the org's connected providers.
export function ProjectRepositories({ projectId, token, admin }: { projectId: string; token: string; admin: boolean }) {
  const { t, i18n } = useLingui();
  const [linked, setLinked] = useState<ProjectRepo[] | null>(null);
  const [connected, setConnected] = useState<GitProvider[]>([]);
  const [provider, setProvider] = useState<GitProvider | null>(null);
  const [choices, setChoices] = useState<GitRepo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => projectRepos.list(projectId, token).then(setLinked, () => setError(t`Couldn’t load the linked repositories.`));
  useEffect(() => {
    void load();
    for (const p of GIT_PROVIDERS) {
      integrations.status(p, token).then((s) => s.connected && setConnected((c) => (c.includes(p) ? c : [...c, p])), () => {});
    }
  }, [projectId]); // token refreshes must not refetch

  async function pickProvider(p: GitProvider) {
    setProvider(p);
    setChoices(null);
    setError('');
    try {
      setChoices(await integrations.repos(p, token));
    } catch (err) {
      setError(integrationError(i18n, err, t`Couldn’t list ${PROVIDER_NAMES[p]} repositories.`));
    }
  }

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

  return (
    <RepositoriesView
      linked={linked} admin={admin} connected={connected} provider={provider} choices={choices} busy={busy} error={error}
      onProvider={pickProvider}
      onLink={(fullName) => provider && run(() => projectRepos.link(projectId, provider, fullName, token), t`Couldn’t link the repository.`)}
      onUnlink={(r) => confirm(t`Unlink ${r.full_name}? Its pull requests stop linking to this project's tickets.`) &&
        run(() => projectRepos.unlink(projectId, r.provider, r.full_name, token), t`Couldn’t unlink the repository.`)}
    />
  );
}

// RepositoriesView: the linked repos and, for admins, the link controls (pure, for tests).
export function RepositoriesView({ linked, admin, connected, provider, choices, busy, error, onProvider, onLink, onUnlink }: {
  linked: ProjectRepo[] | null; admin: boolean; connected: GitProvider[]; provider: GitProvider | null; choices: GitRepo[] | null;
  busy: boolean; error: string; onProvider: (p: GitProvider) => void; onLink: (fullName: string) => void; onUnlink: (r: ProjectRepo) => void;
}) {
  const { t, i18n } = useLingui();
  const linkedNames = new Set((linked ?? []).map((r) => `${r.provider}:${r.full_name.toLowerCase()}`));
  const available = (choices ?? []).filter((r) => provider && !linkedNames.has(`${provider}:${r.full_name.toLowerCase()}`));
  const privateNames = new Set(available.filter((r) => r.private).map((r) => r.full_name));
  return (
    <section aria-label={t`Repositories`}>
      <p className="mb-4 text-muted-foreground"><Trans>Pull requests in these repositories that mention a ticket&apos;s key (e.g. in the branch name) show on the ticket; merging one closes it.</Trans></p>
      {linked === null ? <p className="text-sm text-muted-foreground"><Trans>Loading…</Trans></p>
        : linked.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>No repositories linked yet.</Trans></p>
        : (
          <ul className="divide-y rounded-xl border">
            {linked.map((r) => (
              <li key={`${r.provider}:${r.full_name}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <Badge variant="outline">{PROVIDER_NAMES[r.provider]}</Badge>
                <span className="min-w-0 flex-1 font-medium">{r.full_name}</span>
                <span className="text-muted-foreground">{r.default_branch}</span>
                {admin && <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => onUnlink(r)}><Trans>Unlink</Trans></Button>}
              </li>
            ))}
          </ul>
        )}
      {admin && (
        connected.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            <Trans>Connect {connectHint(i18n)} in <Link href="/settings/integrations" className="font-medium text-foreground underline">Settings → Integrations</Link> to link repositories.</Trans>
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {connected.map((p) => (
              <Button key={p} size="sm" variant={provider === p ? 'secondary' : 'outline'} disabled={busy} onClick={() => onProvider(p)}>
                {provider === p && choices === null && <Spinner aria-hidden />}<Trans>Link from {PROVIDER_NAMES[p]}</Trans>
              </Button>
            ))}
            {provider && (choices === null ? <span role="status" className="text-sm text-muted-foreground"><Trans>Loading repositories…</Trans></span>
              : available.length === 0 ? <span className="text-sm text-muted-foreground"><Trans>No other repositories to link.</Trans></span>
              : (
                // a combobox, not a select: with many orgs connected the list is long (TL-562)
                <Combobox items={available.map((r) => r.full_name)} value={null} onValueChange={(v) => v && onLink(v)} disabled={busy}>
                  <ComboboxInput className="min-w-72" placeholder={t`Search repositories…`} aria-label={t`Choose a ${PROVIDER_NAMES[provider]} repository`} disabled={busy} />
                  <ComboboxContent>
                    <ComboboxEmpty><Trans>No repositories match.</Trans></ComboboxEmpty>
                    <ComboboxList>
                      {(name: string) => <ComboboxItem key={name} value={name}>{name}{privateNames.has(name) ? ` ${t`(private)`}` : ''}</ComboboxItem>}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              ))}
          </div>
        )
      )}
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}

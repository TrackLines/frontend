'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { integrations, projectRepos, type GitRepo, type ProjectRepo } from '@/lib/api';
import { PROVIDER_NAMES, connectHint, gitProviders, integrationError } from '@/lib/integrations';

type GitProvider = ProjectRepo['provider'];

// ProjectRepositories: repos linked to the project. Pull requests in them that mention a ticket's
// key show on the ticket (and merging closes it). Admins link from the org's connected providers.
export function ProjectRepositories({ projectId, token, admin, bitbucket = false }: { projectId: string; token: string; admin: boolean; bitbucket?: boolean }) {
  const [linked, setLinked] = useState<ProjectRepo[] | null>(null);
  const [connected, setConnected] = useState<GitProvider[]>([]);
  const [provider, setProvider] = useState<GitProvider | null>(null);
  const [choices, setChoices] = useState<GitRepo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => projectRepos.list(projectId, token).then(setLinked, () => setError('Couldn’t load the linked repositories.'));
  useEffect(() => {
    void load();
    for (const p of gitProviders(bitbucket)) {
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
      setError(integrationError(err, `Couldn’t list ${PROVIDER_NAMES[p]} repositories.`));
    }
  }

  async function run(action: () => Promise<unknown>, failed: string) {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
    } catch (err) {
      setError(integrationError(err, failed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <RepositoriesView
      linked={linked} admin={admin} connected={connected} provider={provider} choices={choices} busy={busy} error={error} bitbucket={bitbucket}
      onProvider={pickProvider}
      onLink={(fullName) => provider && run(() => projectRepos.link(projectId, provider, fullName, token), 'Couldn’t link the repository.')}
      onUnlink={(r) => confirm(`Unlink ${r.full_name}? Its pull requests stop linking to this project's tickets.`) &&
        run(() => projectRepos.unlink(projectId, r.provider, r.full_name, token), 'Couldn’t unlink the repository.')}
    />
  );
}

// RepositoriesView: the linked repos and, for admins, the link controls (pure, for tests).
export function RepositoriesView({ linked, admin, connected, provider, choices, busy, error, onProvider, onLink, onUnlink, bitbucket = false }: {
  bitbucket?: boolean; linked: ProjectRepo[] | null; admin: boolean; connected: GitProvider[]; provider: GitProvider | null; choices: GitRepo[] | null;
  busy: boolean; error: string; onProvider: (p: GitProvider) => void; onLink: (fullName: string) => void; onUnlink: (r: ProjectRepo) => void;
}) {
  const linkedNames = new Set((linked ?? []).map((r) => `${r.provider}:${r.full_name.toLowerCase()}`));
  const available = (choices ?? []).filter((r) => provider && !linkedNames.has(`${provider}:${r.full_name.toLowerCase()}`));
  return (
    <section aria-label="Repositories">
      <p className="mb-4 text-muted-foreground">Pull requests in these repositories that mention a ticket&apos;s key (e.g. in the branch name) show on the ticket; merging one closes it.</p>
      {linked === null ? <p className="text-sm text-muted-foreground">Loading…</p>
        : linked.length === 0 ? <p className="text-sm text-muted-foreground">No repositories linked yet.</p>
        : (
          <ul className="divide-y rounded-xl border">
            {linked.map((r) => (
              <li key={`${r.provider}:${r.full_name}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <Badge variant="outline">{PROVIDER_NAMES[r.provider]}</Badge>
                <span className="min-w-0 flex-1 font-medium">{r.full_name}</span>
                <span className="text-muted-foreground">{r.default_branch}</span>
                {admin && <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => onUnlink(r)}>Unlink</Button>}
              </li>
            ))}
          </ul>
        )}
      {admin && (
        connected.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Connect {connectHint(bitbucket)} in <Link href="/settings/integrations" className="font-medium text-foreground underline">Settings → Integrations</Link> to link repositories.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {connected.map((p) => (
              <Button key={p} size="sm" variant={provider === p ? 'secondary' : 'outline'} disabled={busy} onClick={() => onProvider(p)}>Link from {PROVIDER_NAMES[p]}</Button>
            ))}
            {provider && (choices === null ? <span className="text-sm text-muted-foreground">Loading repositories…</span>
              : available.length === 0 ? <span className="text-sm text-muted-foreground">No other repositories to link.</span>
              : (
                <Select items={Object.fromEntries(available.map((r) => [r.full_name, r.full_name]))} value={null} onValueChange={(v) => v && onLink(String(v))} disabled={busy}>
                  <SelectTrigger size="sm" className="min-w-56" aria-label={`Choose a ${PROVIDER_NAMES[provider]} repository`}>
                    <SelectValue placeholder="Choose a repository…" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((r) => <SelectItem key={r.full_name} value={r.full_name}>{r.full_name}{r.private ? ' (private)' : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              ))}
          </div>
        )
      )}
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}

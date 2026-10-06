'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NameDialog } from '@/components/name-dialog';
import { Button } from '@/components/ui/button';
import { apiKeys, type ApiKey } from '@/lib/api';
import { useToken } from '@/lib/use-token';

const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export default function ApiKeysPage() {
  const token = useToken();
  const [list, setList] = useState<ApiKey[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<{ name: string; key: string } | null>(null); // shown once
  const [copied, setCopied] = useState(false);

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) apiKeys.list(token).then(setList, () => setFailed(true));
  }, [loaded]); // load once; token refreshes must not refetch

  if (failed) return <p className="p-8 text-destructive" role="alert">Couldn&apos;t load your API keys. Please refresh to try again.</p>;
  if (!list || !token) return <p className="p-8 text-muted-foreground" role="status">Loading API keys…</p>;

  async function revoke(k: ApiKey) {
    if (!confirm(`Revoke "${k.name}"? Anything using it stops working immediately.`)) return;
    await apiKeys.revoke(k.id, token);
    setList((l) => l && l.filter((x) => x.id !== k.id));
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← Projects</Link>
      <header className="mt-2 mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">API keys</h1>
        <Button onClick={() => setCreating(true)}>New key</Button>
      </header>
      <p className="mb-6 text-muted-foreground">
        Give each agent or script its own key. A key acts as you: send it as{' '}
        <code className="rounded bg-muted px-1">Authorization: Bearer tl_…</code> to <code className="rounded bg-muted px-1">/api</code>.
      </p>

      {fresh && (
        <div role="status" className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="mb-2 font-medium">Key for “{fresh.name}” — copy it now, it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-background px-2 py-1.5 text-sm">{fresh.key}</code>
            <Button size="sm" onClick={() => navigator.clipboard.writeText(fresh.key).then(() => setCopied(true))}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No keys yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {list.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
              <span className="font-medium">{k.name}</span>
              <code className="text-sm text-muted-foreground">{k.prefix}…</code>
              <span className="text-sm text-muted-foreground">
                {k.last_used_at ? `last used ${when.format(new Date(k.last_used_at))}` : 'never used'}
              </span>
              <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => revoke(k)}>Revoke</Button>
            </li>
          ))}
        </ul>
      )}

      <NameDialog
        open={creating}
        onOpenChange={setCreating}
        title="New API key"
        description="Name it after the agent or script that will use it."
        placeholder="e.g. codex"
        submitLabel="Create key"
        onSubmit={async (name) => {
          const k = await apiKeys.create(name, token).catch(() => { throw new Error('Couldn’t create the key. Please try again.'); });
          const { key, ...meta } = k;
          setList((l) => [...(l ?? []), meta]);
          setFresh({ name, key });
          setCopied(false);
        }}
      />
    </main>
  );
}

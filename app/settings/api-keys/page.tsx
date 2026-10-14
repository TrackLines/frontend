'use client';

import { ListPageSkeleton } from '@/components/page-skeletons';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError, apiKeys, type ApiKey } from '@/lib/api';
import { ApiKeyList, FreshKey, NewKeyDialog, SetupDialog, splitSecret, type FreshKeyInfo } from '@/components/settings/api-keys';
import { useToken } from '@/lib/use-token';

export default function ApiKeysPage() {
  const token = useToken();
  const [list, setList] = useState<ApiKey[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<FreshKeyInfo | null>(null); // shown once
  const [setupOpen, setSetupOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) apiKeys.list(token).then(setList, () => setFailed(true));
  }, [loaded]); // load once; token refreshes must not refetch

  if (failed) return <p className="p-8 text-destructive" role="alert">Couldn&apos;t load your API keys. Please refresh to try again.</p>;
  if (!list || !token) return <ListPageSkeleton label="Loading API keys…" action />;

  async function revoke(k: ApiKey) {
    if (!confirm(`Revoke "${k.name}"? Anything using it stops working immediately.`)) return;
    await apiKeys.revoke(k.id, token);
    setList((l) => l && l.filter((x) => x.id !== k.id));
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← Projects</Link>
      <header className="mt-2 mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">API keys</h1>
        <Button onClick={() => setCreating(true)}>New key</Button>
      </header>
      <p className="mb-6 text-muted-foreground">
        Give each agent or script its own key. A key acts as you: send it as{' '}
        <code className="rounded bg-muted px-1">Authorization: Bearer tl_ai_…</code> (or <code className="rounded bg-muted px-1">tl_s_…</code> for a service key) to <code className="rounded bg-muted px-1">/api</code>.
      </p>

      {fresh && <FreshKey fresh={fresh} copied={copied} onCopy={() => navigator.clipboard.writeText(fresh.key).then(() => setCopied(true))} onSetup={() => setSetupOpen(true)} />}
      <ApiKeyList list={list} onRevoke={(k) => void revoke(k)} />

      {fresh?.kind === 'ai' && <SetupDialog fresh={fresh} open={setupOpen} onOpenChange={setSetupOpen} />}
      <NewKeyDialog
        open={creating}
        onOpenChange={setCreating}
        onCreate={async (input) => {
          const k = await apiKeys.create(input, token).catch((err) => {
            throw new Error(err instanceof ApiError && err.status < 500 ? err.message : 'Couldn’t create the key. Please try again.');
          });
          const { listed, secret } = splitSecret(k);
          setList((l) => [...(l ?? []), listed]);
          setFresh({ name: listed.display ?? listed.name, kind: listed.kind, key: secret, client: listed.client });
          setCopied(false);
          setSetupOpen(listed.kind === 'ai'); // straight to that agent's setup steps (TL-269)
        }}
      />
    </main>
  );
}

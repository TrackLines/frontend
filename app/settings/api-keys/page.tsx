'use client';

import { ListPageSkeleton } from '@/components/page-skeletons';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NameDialog } from '@/components/name-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiKeys, type ApiKey, type ApiKeyKind } from '@/lib/api';
import { ApiKeyList, FreshKey, splitSecret } from '@/components/settings/api-keys';
import { useToken } from '@/lib/use-token';

export default function ApiKeysPage() {
  const token = useToken();
  const [list, setList] = useState<ApiKey[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingKind, setCreatingKind] = useState<ApiKeyKind>('ai');
  const [fresh, setFresh] = useState<{ name: string; kind: ApiKeyKind; key: string } | null>(null); // shown once
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
        <code className="rounded bg-muted px-1">Authorization: Bearer tl_…</code> to <code className="rounded bg-muted px-1">/api</code>.
      </p>

      {fresh && <FreshKey fresh={fresh} copied={copied} onCopy={() => navigator.clipboard.writeText(fresh.key).then(() => setCopied(true))} />}
      <ApiKeyList list={list} onRevoke={(k) => void revoke(k)} />

      <NameDialog
        open={creating}
        title="New API key"
        description="AI keys can be assigned tickets. Service keys are for servers and integrations."
        placeholder="e.g. codex"
        submitLabel="Create key"
        onOpenChange={(open) => { setCreating(open); if (!open) setCreatingKind('ai'); }}
        onSubmit={async (name) => {
          const kind = creatingKind;
          const k = await apiKeys.create(name, kind, token).catch(() => { throw new Error('Couldn’t create the key. Please try again.'); });
          const { listed, secret } = splitSecret(k);
          setList((l) => [...(l ?? []), listed]);
          setFresh({ name, kind, key: secret });
          setCopied(false);
        }}
      >
        <label className="grid gap-1.5 text-sm font-medium">
          Key type
          <Select value={creatingKind} onValueChange={(value) => value && setCreatingKind(value as ApiKeyKind)}>
            <SelectTrigger aria-label="Key type" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ai">AI agent</SelectItem>
              <SelectItem value="service">Server / API integration</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </NameDialog>
    </main>
  );
}

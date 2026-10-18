'use client';

import { ListPageSkeleton } from '@/components/page-skeletons';
import Link from 'next/link';
import { useFlags } from '@flags-gg/react-library';
import { ApiKeysManager } from '@/components/settings/api-keys';
import type { ApiKeyKind } from '@/lib/api';
import { useToken } from '@/lib/use-token';

// The organization's keys: service keys for servers and integrations. AI agent keys are personal and
// made in Your settings; this page's AI tab stays behind the org-ai-keys flag (TL-451).
export default function ApiKeysPage() {
  const token = useToken();
  const { is } = useFlags();
  if (!token) return <ListPageSkeleton label="Loading API keys…" action />;
  const kinds: ApiKeyKind[] = is('org-ai-keys').enabled() ? ['service', 'ai'] : ['service'];
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← Settings</Link>
      <h1 className="mt-2 mb-2 text-3xl font-bold tracking-tight">API keys</h1>
      <p className="mb-6 text-muted-foreground">
        Service keys for servers and integrations: send one as{' '}
        <code className="rounded bg-muted px-1">Authorization: Bearer tl_s_…</code> to <code className="rounded bg-muted px-1">/api</code>.
        Your own keys and AI agents are in <Link href="/account#api-keys" className="font-medium text-foreground underline">Your settings</Link>.
      </p>
      <ApiKeysManager token={token} kinds={kinds} />
    </main>
  );
}

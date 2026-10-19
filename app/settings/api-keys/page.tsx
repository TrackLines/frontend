'use client';

import { ListPageSkeleton } from '@/components/page-skeletons';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useFlags } from '@flags-gg/react-library';
import { ApiKeysManager } from '@/components/settings/api-keys';
import { organization, type ApiKeyKind } from '@/lib/api';
import { useToken } from '@/lib/use-token';

// The organization's keys: service keys for servers and integrations. AI agent keys are personal and
// made in Your settings; this page's AI tab stays behind the org-ai-keys flag (TL-451). Everyone sees
// the service keys and when they expire; only organization admins make and revoke them (TL-462).
export default function ApiKeysPage() {
  const token = useToken();
  const { is } = useFlags();
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => { if (token) organization.me(token).then((me) => setAdmin(me.admin), () => setAdmin(false)); }, [!!token]);
  if (!token || admin === null) return <ListPageSkeleton label="Loading API keys…" action />;
  const kinds: ApiKeyKind[] = is('org-ai-keys').enabled() ? ['service', 'ai'] : ['service'];
  return (
    <ApiKeysManager token={token} kinds={kinds} manage={admin ? kinds : kinds.filter((k) => k !== 'service')} back={{ href: '/settings', label: 'Settings' }} intro={<>
      Service keys for servers and integrations: send one as{' '}
      <code className="rounded bg-muted px-1">Authorization: Bearer tl_s_…</code> to <code className="rounded bg-muted px-1">/api</code>.
      {!admin && 'Only organization admins can make or revoke them. '}
      Your own keys and AI agents are in <Link href="/account/api-keys" className="font-medium text-foreground underline">Your settings</Link>.
    </>} />
  );
}

'use client';

import Link from 'next/link';
import { ListPageSkeleton } from '@/components/page-skeletons';
import { IntegrationsSettings } from '@/components/settings/integrations';
import { useToken } from '@/lib/use-token';

export default function IntegrationsPage() {
  const token = useToken();
  if (!token) return <ListPageSkeleton label="Loading integrations…" />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← Settings</Link>
      <h1 className="mt-2 mb-2 text-3xl font-bold tracking-tight">Integrations</h1>
      <p className="mb-6 text-muted-foreground">Connect your organization to the tools it uses. Link repositories to a project from the project&apos;s page.</p>
      <IntegrationsSettings token={token} />
    </main>
  );
}

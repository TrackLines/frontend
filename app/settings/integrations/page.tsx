'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { ListPageSkeleton } from '@/components/page-skeletons';
import { IntegrationsSettings } from '@/components/settings/integrations';
import { useToken } from '@/lib/use-token';

export default function IntegrationsPage() {
  const token = useToken();
  const { t } = useLingui();
  if (!token) return <ListPageSkeleton label={t`Loading integrations…`} />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← <Trans>Settings</Trans></Link>
      <h1 className="mt-2 mb-2 text-3xl font-bold tracking-tight"><Trans>Integrations</Trans></h1>
      <p className="mb-6 text-muted-foreground"><Trans>Connect your organization to the tools it uses. Link repositories to a project from the project&apos;s page.</Trans></p>
      <IntegrationsSettings token={token} />
    </main>
  );
}

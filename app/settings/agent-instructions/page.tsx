'use client';

import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { ListPageSkeleton } from '@/components/layout/page-skeletons';
import { OrgAgentInstructions } from '@/components/settings/agent-instructions';
import { organization } from '@/lib/api';
import { useToken } from '@/lib/hooks/use-token';

// The organization's additional instructions for AI agents (TL-901): its admins only.
export default function AgentInstructionsPage() {
  const token = useToken();
  const { orgId } = useAuth();
  const { t } = useLingui();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const signedIn = token !== null;
  // another organization: ask again who's an admin, and start the editor again (its key below)
  useEffect(() => {
    setAdmin(null);
    if (token) organization.me(token).then((r) => setAdmin(r.admin), () => setAdmin(false));
  }, [signedIn, orgId]);
  if (!token || admin === null) return <ListPageSkeleton label={t`Loading agent instructions…`} sections={1} />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← <Trans>Settings</Trans></Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Additional agent instructions</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>Your organization’s own instructions for AI agents working on its tickets.</Trans></p>
      </header>
      <section className="rounded-xl border p-5">
        {admin
          ? <OrgAgentInstructions key={orgId ?? ''} token={token} />
          : <p className="text-sm text-muted-foreground"><Trans>Only organization admins can see or change the additional agent instructions.</Trans></p>}
      </section>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useFlags } from '@flags-gg/react-library';
import { Suspense, useEffect, useState } from 'react';
import { ListPageSkeleton } from '@/components/layout/page-skeletons';
import { AuditLog } from '@/components/settings/audit-log';
import { billing, organization, type Subscription } from '@/lib/api';
import { usePeople } from '@/lib/hooks/use-people';
import { useToken } from '@/lib/hooks/use-token';

// The org's audit log (TL-671): org admins, on Pro (the last year) or Enterprise (everything).
export default function AuditLogPage() {
  const token = useToken();
  const { t } = useLingui();
  const { is } = useFlags();
  const people = usePeople(token);
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [plan, setPlan] = useState<Subscription | null>(null);
  const signedIn = token !== null;
  useEffect(() => {
    if (!token) return;
    organization.me(token).then((r) => setAdmin(r.admin), () => setAdmin(false));
    billing.status(token).then(setPlan, () => setPlan({ paid: false, project_limit: 1 }));
  }, [signedIn]);

  if (!token || admin === null || !plan) return <ListPageSkeleton label={t`Loading audit log…`} sections={1} />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← <Trans>Settings</Trans></Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Audit log</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>Who did what across your organization. Changes to tickets themselves are in each ticket’s history.</Trans></p>
      </header>
      {!admin ? (
        <p role="alert" className="text-sm text-muted-foreground" data-audit-admins><Trans>Only organization admins can see the audit log.</Trans></p>
      ) : !plan.paid ? (
        <p className="text-sm text-muted-foreground" data-audit-plan>
          <Trans>The audit log comes with the Pro and Enterprise plans. <Link href="/settings" className="font-medium text-foreground underline">Change your plan</Link> to use it.</Trans>
        </p>
      ) : !is('audit-service').enabled() ? (
        <p className="text-sm text-muted-foreground"><Trans>The audit log isn’t turned on for your organization yet.</Trans></p>
      ) : (
        <section className="rounded-xl border p-5">
          {/* useSearchParams (the filters) needs a Suspense boundary for static rendering */}
          <Suspense><AuditLog token={token} people={people} enterprise={plan.plan === 'enterprise'} /></Suspense>
        </section>
      )}
    </main>
  );
}

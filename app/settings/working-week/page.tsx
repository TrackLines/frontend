'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { ListPageSkeleton } from '@/components/layout/page-skeletons';
import { OrgWorkingWeek } from '@/components/settings/working-week';
import { organization } from '@/lib/api';
import { useToken } from '@/lib/hooks/use-token';

// The organization's working week (TL-510); a project can have its own in Edit project.
export default function WorkingWeekPage() {
  const token = useToken();
  const { t } = useLingui();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const signedIn = token !== null;
  useEffect(() => { if (token) organization.me(token).then((r) => setAdmin(r.admin), () => setAdmin(false)); }, [signedIn]);
  if (!token || admin === null) return <ListPageSkeleton label={t`Loading working week…`} sections={1} />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← <Trans>Settings</Trans></Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Working week</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>When your organization works. A project can set its own in Edit project.</Trans></p>
      </header>
      <section className="rounded-xl border p-5"><OrgWorkingWeek token={token} admin={admin} /></section>
    </main>
  );
}

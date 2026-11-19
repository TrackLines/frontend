'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { ListPageSkeleton } from '@/components/layout/page-skeletons';
import { ManageProjects } from '@/components/settings/manage-projects';
import { organization } from '@/lib/api';
import { useToken } from '@/lib/hooks/use-token';

// Manage projects (TL-908): org admins archive, restore or delete projects and set their owning teams.
export default function ManageProjectsPage() {
  const token = useToken();
  const { t } = useLingui();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const signedIn = token !== null;
  useEffect(() => { if (token) organization.me(token).then((r) => setAdmin(r.admin), () => setAdmin(false)); }, [signedIn]);
  if (!token || admin === null) return <ListPageSkeleton label={t`Loading projects…`} sections={2} />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← <Trans>Settings</Trans></Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Manage projects</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>Archive projects you’ve finished with, delete ones that were never used, and choose which teams own each.</Trans></p>
      </header>
      {admin ? <ManageProjects token={token} />
        : <p role="alert" className="rounded-xl border p-5 text-sm text-muted-foreground"><Trans>Only organization admins can manage projects.</Trans></p>}
    </main>
  );
}

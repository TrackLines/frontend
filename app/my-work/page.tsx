'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ListPageSkeleton } from '@/components/page-skeletons';
import { MyWork } from '@/components/my-work';
import { useToken } from '@/lib/use-token';

export default function MyWorkPage() {
  const { t } = useLingui();
  const token = useToken();
  if (!token) return <ListPageSkeleton label={t`Loading your work…`} />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline"><Trans>← Projects</Trans></Link>
      <h1 className="mt-2 mb-2 text-3xl font-bold tracking-tight"><Trans>My work</Trans></h1>
      <p className="mb-6 text-muted-foreground"><Trans>Your tickets across every board and project, most recently changed first — assigned to you, or raised by you.</Trans></p>
      {/* useSearchParams needs a Suspense boundary for static rendering */}
      <Suspense><MyWorkTab token={token} /></Suspense>
    </main>
  );
}

// MyWorkTab opens on the tab the link asked for (?tab=created from the dashboard's "See all").
function MyWorkTab({ token }: { token: string }) {
  return <MyWork token={token} initialMode={useSearchParams().get('tab') === 'created' ? 'created' : 'assigned'} />;
}

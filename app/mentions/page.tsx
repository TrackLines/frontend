'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { ListPageSkeleton } from '@/components/page-skeletons';
import { Mentions } from '@/components/mentions';
import { useToken } from '@/lib/use-token';

export default function MentionsPage() {
  const { t } = useLingui();
  const token = useToken();
  if (!token) return <ListPageSkeleton label={t`Loading your mentions…`} />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline"><Trans>← Projects</Trans></Link>
      <h1 className="mt-2 mb-2 text-3xl font-bold tracking-tight"><Trans>Mentions</Trans></h1>
      <p className="mb-6 text-muted-foreground"><Trans>Every ticket where someone @mentioned you, newest first.</Trans></p>
      <Mentions token={token} />
    </main>
  );
}

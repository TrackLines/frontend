'use client';

import Link from 'next/link';
import { Trans } from '@lingui/react/macro';
import { buttonVariants } from '@/components/ui/button';

// Shown when a roadmap is login-only and the visitor isn't signed in.
export function Locked({ id }: { id: string }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight"><Trans>Sign in to view this roadmap</Trans></h1>
      <p className="text-muted-foreground"><Trans>The owner has shared this roadmap with signed-in users only.</Trans></p>
      <Link href={`/sign-in?redirect_url=${encodeURIComponent(`/r/${id}`)}`} className={buttonVariants()}>
        <Trans>Sign in</Trans>
      </Link>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { buttonVariants } from '@/components/ui/button';

// LoadError: a page whose ticket, board, project or roadmap couldn't be loaded. 404 (or 403) says it's
// gone or in another organization (never which); anything else asks for a refresh.
const TITLES = {
  ticket: { missing: msg`Ticket not found`, failed: msg`Couldn't load this ticket` },
  board: { missing: msg`Board not found`, failed: msg`Couldn't load this board` },
  project: { missing: msg`Project not found`, failed: msg`Couldn't load this project` },
  roadmap: { missing: msg`Roadmap not found`, failed: msg`Couldn't load this roadmap` },
};

export function LoadError({ status, thing }: { status: number; thing: keyof typeof TITLES }) {
  const { i18n } = useLingui();
  const missing = status === 404 || status === 403;
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{i18n._(TITLES[thing][missing ? 'missing' : 'failed'])}</h1>
      <p className="text-muted-foreground">{missing ? <Trans>It may have been deleted, or it belongs to another organization.</Trans> : <Trans>Please refresh to try again.</Trans>}</p>
      <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}><Trans>Back to projects</Trans></Link>
    </main>
  );
}

'use client';

import { Trans } from '@lingui/react/macro';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { reportClient } from '@/lib/server/report';

// A page that crashed: reported to Bugfixes (TL-292), with a way to try again.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClient('boundary', error); }, [error]);
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight"><Trans>Something went wrong</Trans></h1>
      <p className="mt-2 text-muted-foreground"><Trans>We’ve been told about it. Try again, or go back to your projects.</Trans></p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}><Trans>Try again</Trans></Button>
        <Button variant="outline" onClick={() => { window.location.href = '/dashboard'; }}><Trans>Projects</Trans></Button>
      </div>
    </main>
  );
}

'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { reportClient } from '@/lib/report';

// A page that crashed: reported to Bugfixes (TL-292), with a way to try again.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClient('boundary', error); }, [error]);
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">We’ve been told about it. Try again, or go back to your projects.</p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => { window.location.href = '/dashboard'; }}>Projects</Button>
      </div>
    </main>
  );
}

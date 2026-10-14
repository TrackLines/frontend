'use client';

import { ListPageSkeleton } from '@/components/page-skeletons';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FileCleanupView } from '@/components/settings/file-cleanup';
import { ApiError, attachments, type FileCleanup } from '@/lib/api';
import { usePeople } from '@/lib/use-people';
import { useToken } from '@/lib/use-token';

// File clean-up (TL-261): org admins see the year-old files due to be deleted, keep any they need,
// and see what the clean-up has already deleted.
export default function FileCleanupPage() {
  const token = useToken();
  const people = usePeople(token);
  const [report, setReport] = useState<FileCleanup | null>(null);
  const [failed, setFailed] = useState('');
  const [error, setError] = useState('');

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) attachments.cleanup(token).then(setReport, (err) =>
      setFailed(err instanceof ApiError && err.status === 403 ? 'Only organization admins can see the file clean-up.' : 'Couldn’t load the file clean-up. Please refresh to try again.'));
  }, [loaded]); // load once; token refreshes must not refetch

  if (failed) return <p className="p-8 text-destructive" role="alert">{failed}</p>;
  if (!report || !token) return <ListPageSkeleton label="Loading file clean-up…" sections={2} />;

  async function keep(id: string) {
    setError('');
    try {
      await attachments.keep(id, token);
      setReport((r) => r && { ...r, due: r.due.filter((f) => f.id !== id) });
    } catch {
      setError('Couldn’t keep that file. Please try again.');
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← Settings</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">File clean-up</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        A year after a file is added, or last kept, it’s due for deletion. Keep any you still need, and they stay another year.
      </p>
      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
      <FileCleanupView report={report} people={people} onKeep={keep} />
    </main>
  );
}

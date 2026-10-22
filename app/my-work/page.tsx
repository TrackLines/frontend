'use client';

import Link from 'next/link';
import { ListPageSkeleton } from '@/components/page-skeletons';
import { MyWork } from '@/components/my-work';
import { useToken } from '@/lib/use-token';

export default function MyWorkPage() {
  const token = useToken();
  if (!token) return <ListPageSkeleton label="Loading your work…" />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← Projects</Link>
      <h1 className="mt-2 mb-2 text-3xl font-bold tracking-tight">My work</h1>
      <p className="mb-6 text-muted-foreground">Your tickets across every board and project, most recently changed first — assigned to you, or raised by you.</p>
      <MyWork token={token} />
    </main>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { auth } from '@clerk/nextjs/server';
import { ApiError, roadmaps } from '@/lib/api';
import { Timeline } from '@/components/roadmap/timeline';
import { Locked } from './locked';

type Props = { params: Promise<{ id: string }> };

// cache(): metadata and page share one backend fetch per request.
// Returns null when the roadmap needs sign-in (401). 403 (team-only) is shown as not found,
// so private roadmaps don't reveal they exist.
const load = cache(async (id: string, token: string | null) => {
  try {
    return await roadmaps.get(id, token);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    if (e instanceof ApiError && (e.status === 403 || e.status === 404)) notFound();
    throw e;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const [{ id }, clerkAuth] = await Promise.all([params, auth()]);
    const r = await load(id, await clerkAuth.getToken());
    return r ? { title: `${r.title} · Roadmap`, description: r.description || undefined } : { title: 'Roadmap' };
  } catch {
    return { title: 'Roadmap' };
  }
}

export default async function RoadmapPage({ params }: Props) {
  const [{ id }, clerkAuth] = await Promise.all([params, auth()]);
  const r = await load(id, await clerkAuth.getToken());
  if (!r) return <Locked id={id} />;
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Roadmap</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{r.title}</h1>
        {r.description && <p className="mt-4 whitespace-pre-line text-lg text-muted-foreground">{r.description}</p>}
      </header>
      <Timeline items={r.items ?? []} />
    </main>
  );
}

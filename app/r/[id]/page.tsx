import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { auth } from '@clerk/nextjs/server';
import { buttonVariants } from '@/components/ui/button';
import { projects, roadmaps } from '@/lib/api';
import { ownerOnly, readRoadmap } from '@/lib/public-roadmap';
import { Timeline } from '@/components/roadmap/timeline';
import { HealthBadge, UpdatesTimeline } from '@/components/roadmap/updates';
import { Locked } from './locked';

type Props = { params: Promise<{ id: string }> };

// cache(): metadata and page share one backend fetch per request.
const load = cache((id: string, token: string | null) => readRoadmap(() => roadmaps.get(id, token)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const [{ id }, clerkAuth] = await Promise.all([params, auth()]);
    const r = await load(id, await clerkAuth.getToken());
    return typeof r === 'object' ? { title: `${r.roadmap.title} · Roadmap`, description: r.roadmap.description || undefined } : { title: 'Roadmap' };
  } catch {
    return { title: 'Roadmap' };
  }
}

export default async function RoadmapPage({ params }: Props) {
  const [{ id }, clerkAuth] = await Promise.all([params, auth()]);
  const token = await clerkAuth.getToken();
  const read = await load(id, token);
  if (read === 'missing') notFound();
  if (read === 'locked') return <Locked id={id} />;
  const r = read.roadmap;
  const [project, updates] = await Promise.all([
    ownerOnly(token, (t) => projects.get(r.project_id, t)),
    roadmaps.updates(r.id, token).catch(() => null), // the roadmap still shows if these don't load
  ]);
  const latest = updates?.at(-1);
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      {project && (
        <nav aria-label="Roadmap navigation" className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href={`/projects/${project.id}`} className="text-muted-foreground hover:text-foreground hover:underline">← {project.name}</Link>
          <Link href="/roadmaps" className="text-muted-foreground hover:text-foreground hover:underline">All roadmaps</Link>
          {r.can_manage && <Link href={`/roadmaps/${r.id}/edit`} className={`${buttonVariants({ variant: 'outline', size: 'sm' })} ml-auto`}>Edit roadmap</Link>}
        </nav>
      )}
      <header className="mb-12">
        <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Roadmap</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight">{r.title}</h1>
          {latest && <HealthBadge health={latest.health} />}
        </div>
        {r.description && <p className="mt-4 whitespace-pre-line text-lg text-muted-foreground">{r.description}</p>}
      </header>
      <Timeline id={r.id} items={r.items ?? []} progress={r.progress} />
      {updates && (
        <section aria-labelledby="updates-heading" className="mt-16 grid max-w-3xl gap-4">
          <h2 id="updates-heading" className="text-2xl font-semibold tracking-tight">Updates</h2>
          <UpdatesTimeline updates={updates} />
        </section>
      )}
    </main>
  );
}

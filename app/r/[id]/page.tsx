import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { msg } from '@lingui/core/macro';
import { serverI18n } from '@/lib/i18n/server-i18n';
import { auth } from '@clerk/nextjs/server';
import { buttonVariants } from '@/components/ui/button';
import { projects, roadmaps } from '@/lib/api';
import { isRoadmapId, ownerOnly, readRoadmap } from '@/lib/site/public-roadmap';
import { Timeline } from '@/components/roadmap/timeline';
import { HealthBadge, UpdatesTimeline } from '@/components/roadmap/updates';
import { RoadmapReport } from '@/components/roadmap/report';
import { Locked } from './locked';

type Props = { params: Promise<{ id: string }> };

// cache(): metadata and page share one backend fetch per request.
const load = cache((id: string, token: string | null) => readRoadmap(() => roadmaps.get(id, token)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const i18n = await serverI18n();
  const title = i18n._(msg`Roadmap`);
  try {
    if (!isRoadmapId((await params).id)) return { title };
    const [{ id }, clerkAuth] = await Promise.all([params, auth()]);
    const r = await load(id, await clerkAuth.getToken());
    if (typeof r !== 'object') return { title };
    const name = r.roadmap.title;
    return { title: i18n._(msg`${name} · Roadmap`), description: r.roadmap.description || undefined };
  } catch {
    return { title };
  }
}

export default async function RoadmapPage({ params }: Props) {
  if (!isRoadmapId((await params).id)) notFound();
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
  const i18n = await serverI18n();
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      {project && (
        <nav aria-label={i18n._(msg`Roadmap navigation`)} className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm print:hidden">
          <Link href={`/projects/${project.id}`} className="text-muted-foreground hover:text-foreground hover:underline">← {project.name}</Link>
          <Link href="/roadmaps" className="text-muted-foreground hover:text-foreground hover:underline">{i18n._(msg`All roadmaps`)}</Link>
          {r.can_manage && <div className="ml-auto flex items-center gap-2">
            <RoadmapReport roadmap={r} updates={updates ?? []} />
            <Link href={`/roadmaps/${r.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>{i18n._(msg`Edit roadmap`)}</Link>
          </div>}
        </nav>
      )}
      <header className="mb-12">
        <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">{i18n._(msg`Roadmap`)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight">{r.title}</h1>
          {latest && <HealthBadge health={latest.health} />}
        </div>
        {r.description && <p className="mt-4 whitespace-pre-line text-lg text-muted-foreground">{r.description}</p>}
      </header>
      <Timeline id={r.id} items={r.items ?? []} progress={r.progress} />
      {updates && (
        <section aria-labelledby="updates-heading" className="mt-16 grid max-w-3xl gap-4">
          <h2 id="updates-heading" className="text-2xl font-semibold tracking-tight">{i18n._(msg`Updates`)}</h2>
          <UpdatesTimeline updates={updates} />
        </section>
      )}
    </main>
  );
}

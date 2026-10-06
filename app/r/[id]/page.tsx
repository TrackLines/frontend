import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { auth } from '@clerk/nextjs/server';
import { buttonVariants } from '@/components/ui/button';
import { ApiError, projects, roadmaps, type Project } from '@/lib/api';
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

// ownerProject returns the roadmap's project when the viewer owns it (so we can show app nav),
// or null for everyone else — people reading a shared link see a clean page and learn nothing.
async function ownerProject(projectId: string, token: string | null): Promise<Project | null> {
  if (!token) return null;
  try {
    return await projects.get(projectId, token);
  } catch {
    return null;
  }
}

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
  const token = await clerkAuth.getToken();
  const r = await load(id, token);
  if (!r) return <Locked id={id} />;
  const project = await ownerProject(r.project_id, token);
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      {project && (
        <nav aria-label="Roadmap navigation" className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href={`/projects/${project.id}`} className="text-muted-foreground hover:text-foreground hover:underline">← {project.name}</Link>
          <Link href="/roadmaps" className="text-muted-foreground hover:text-foreground hover:underline">All roadmaps</Link>
          <Link href={`/roadmaps/${r.id}/edit`} className={`${buttonVariants({ variant: 'outline', size: 'sm' })} ml-auto`}>Edit roadmap</Link>
        </nav>
      )}
      <header className="mb-12">
        <p className="text-sm font-bold uppercase tracking-[.14em] text-primary">Roadmap</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{r.title}</h1>
        {r.description && <p className="mt-4 whitespace-pre-line text-lg text-muted-foreground">{r.description}</p>}
      </header>
      <Timeline items={r.items ?? []} />
    </main>
  );
}

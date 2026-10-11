'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ListPageSkeleton } from '@/components/page-skeletons';
import { ProjectRepositories } from '@/components/project/repositories';
import { organization, projects, type Project } from '@/lib/api';
import { useToken } from '@/lib/use-token';

// A project's linked repositories, on their own page (linked from the project's header).
export default function ProjectRepositoriesPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const [project, setProject] = useState<Project | null>(null);
  const [admin, setAdmin] = useState(false);
  const [failed, setFailed] = useState(false);
  const loaded = token !== null;
  useEffect(() => {
    if (!loaded) return;
    projects.get(id, token).then(setProject, () => setFailed(true));
    organization.me(token).then((r) => setAdmin(r.admin), () => setAdmin(false));
  }, [id, loaded]); // token refreshes must not refetch

  if (failed) return <p role="alert" className="p-8 text-destructive">Couldn&apos;t load this project. Please refresh to try again.</p>;
  if (!project || !token) return <ListPageSkeleton label="Loading repositories…" />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href={`/projects/${project.id}`} className="text-sm text-muted-foreground hover:underline">← {project.name}</Link>
      <h1 className="mt-2 mb-2 text-3xl font-bold tracking-tight">Repositories</h1>
      <ProjectRepositories projectId={project.id} token={token} admin={admin} />
    </main>
  );
}

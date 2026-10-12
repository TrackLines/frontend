'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ListPageSkeleton } from '@/components/page-skeletons';
import { ArchivedBoards } from '@/components/project/archived-boards';
import { projects, type Project } from '@/lib/api';
import { useToken } from '@/lib/use-token';

// Archived boards: off the project page, history kept; restore them here.
export default function ArchivedBoardsPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const [project, setProject] = useState<Project | null>(null);
  const [failed, setFailed] = useState(false);
  const loaded = token !== null;
  useEffect(() => { if (loaded) projects.get(id, token).then(setProject, () => setFailed(true)); }, [id, loaded]);

  if (failed) return <p role="alert" className="p-8 text-destructive">Couldn&apos;t load this project.</p>;
  if (!project || !token) return <ListPageSkeleton label="Loading archived boards…" />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href={`/projects/${project.id}/edit`} className="text-sm text-muted-foreground hover:underline">← Edit {project.name}</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Archived boards</h1>
      <p className="mb-6 text-muted-foreground">Boards that have been used are archived instead of deleted, so their history stays. Restore one to put it back on the project.</p>
      <ArchivedBoards projectId={project.id} token={token} />
    </main>
  );
}

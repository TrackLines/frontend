'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ListPageSkeleton } from '@/components/layout/page-skeletons';
import { ArchivedBoards } from '@/components/project/archived-boards';
import { projects, type Project } from '@/lib/api';
import { useToken } from '@/lib/hooks/use-token';

// Archived boards: off the project page, history kept; restore them here.
export default function ArchivedBoardsPage() {
  const { t } = useLingui();
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const [project, setProject] = useState<Project | null>(null);
  const [failed, setFailed] = useState(false);
  const loaded = token !== null;
  useEffect(() => { if (loaded) projects.get(id, token).then(setProject, () => setFailed(true)); }, [id, loaded]);

  if (failed) return <p role="alert" className="p-8 text-destructive"><Trans>Couldn&apos;t load this project.</Trans></p>;
  if (!project || !token) return <ListPageSkeleton label={t`Loading archived boards…`} />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href={`/projects/${project.id}/edit`} className="text-sm text-muted-foreground hover:underline"><Trans>← Edit {project.name}</Trans></Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight"><Trans>Archived boards</Trans></h1>
      <p className="mb-6 text-muted-foreground"><Trans>Boards that have been used are archived instead of deleted, so their history stays. Restore one to put it back on the project.</Trans></p>
      <ArchivedBoards projectId={project.id} token={token} />
    </main>
  );
}

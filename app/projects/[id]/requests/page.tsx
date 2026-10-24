'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Triage } from '@/components/intake/triage';
import { ListPageSkeleton } from '@/components/page-skeletons';
import { projects, type Project } from '@/lib/api';
import { useToken } from '@/lib/use-token';

// A project's request inbox: what came in through its public request form.
export default function RequestsPage() {
  const { t } = useLingui();
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const [project, setProject] = useState<Project | null>(null);
  const [failed, setFailed] = useState(false);
  const loaded = token !== null;
  useEffect(() => { if (loaded) projects.get(id, token).then(setProject, () => setFailed(true)); }, [id, loaded]);

  if (failed) return <p role="alert" className="p-8 text-destructive"><Trans>Couldn&apos;t load this project. It may belong to another organization.</Trans></p>;
  if (!project || !token) return <ListPageSkeleton label={t`Loading requests…`} />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href={`/projects/${project.id}`} className="text-sm text-muted-foreground hover:underline">← {project.name}</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight"><Trans>Requests</Trans></h1>
      <p className="mb-6 text-muted-foreground"><Trans>Bug reports and feature requests sent through the project&apos;s request form. Add the useful ones to the backlog.</Trans></p>
      <Triage projectId={project.id} token={token} />
    </main>
  );
}

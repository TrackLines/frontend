'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EditableTitle } from '@/components/editable-title';
import { ListPageSkeleton } from '@/components/page-skeletons';
import { ProjectKeyPrefix } from '@/components/project/key-prefix';
import { NewBoardButton } from '@/components/project/new-board';
import { ProjectRepositories } from '@/components/project/repositories';
import { IntakeSettingsSection } from '@/components/intake/intake-settings';
import { organization, projects, type Project } from '@/lib/api';
import { useCachedState } from '@/lib/page-cache';
import { useFlags } from '@flags-gg/react-library';
import { useToken } from '@/lib/use-token';

// Edit project: the project's setup, kept off its main page: name, ticket key prefix, more boards
// and linked repositories.
export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const { is } = useFlags(); // flags.gg: Bitbucket is off until its flag is on
  const [project, setProject] = useCachedState<Project>(`project:${id}`); // shared with the project page
  const [, setProjects] = useCachedState<Project[]>('projects');
  const [admin, setAdmin] = useState(false);
  const [failed, setFailed] = useState(false);
  const loaded = token !== null;
  useEffect(() => {
    if (!loaded) return;
    projects.get(id, token).then(setProject, () => setFailed(true));
    organization.me(token).then((r) => setAdmin(r.admin), () => setAdmin(false));
  }, [id, loaded]); // token refreshes must not refetch

  if (failed) return <p role="alert" className="p-8 text-destructive">Couldn&apos;t load this project. Please refresh to try again.</p>;
  if (!project || !token) return <ListPageSkeleton label="Loading project…" />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href={`/projects/${project.id}`} className="text-sm text-muted-foreground hover:underline">← {project.name}</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Edit project</h1>

      <Section title="Name">
        <EditableTitle
          value={project.name}
          label="project"
          editable
          as="p"
          className="text-lg font-medium"
          onSave={async (name) => {
            await projects.update(project.id, { name, description: project.description }, token);
            setProject((current) => current && { ...current, name });
            setProjects((current) => current?.map((item) => item.id === project.id ? { ...item, name } : item) ?? current);
          }}
        />
      </Section>

      <Section title="Ticket keys">
        <ProjectKeyPrefix project={project} token={token} editable={admin} onChanged={(key_prefix) => setProject((current) => current && { ...current, key_prefix })} />
      </Section>

      <Section title="Boards">
        <p className="mb-3 text-sm text-muted-foreground">
          {project.boards?.length ?? 0} board{project.boards?.length === 1 ? '' : 's'}. One board per team.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <NewBoardButton projectId={project.id} token={token} variant="outline" />
          <Link href={`/projects/${project.id}/archived`} className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline">Archived boards →</Link>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">To delete or archive a board, open it and use Edit board.</p>
      </Section>

      <Section title="Request form">
        <IntakeSettingsSection projectId={project.id} token={token} />
      </Section>

      <Section title="Repositories">
        <ProjectRepositories projectId={project.id} token={token} admin={admin} bitbucket={is('bitbucket').enabled()} />
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-xl border p-5">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

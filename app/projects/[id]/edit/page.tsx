'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GitPullRequestIcon, HashIcon, InboxIcon, KanbanIcon, TypeIcon } from 'lucide-react';
import { EditableTitle } from '@/components/editable-title';
import { SettingsCard } from '@/components/settings/settings-card';
import { ListPageSkeleton } from '@/components/page-skeletons';
import { ProjectKeyPrefix } from '@/components/project/key-prefix';
import { NewBoardButton } from '@/components/project/new-board';
import { ProjectRepositories } from '@/components/project/repositories';
import { IntakeSettingsSection } from '@/components/intake/intake-settings';
import { organization, projects, type Project } from '@/lib/api';
import { useCachedState } from '@/lib/page-cache';
import { useToken } from '@/lib/use-token';

// Edit project: the project's setup, kept off its main page: name, ticket key prefix, more boards
// and linked repositories.
export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
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
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit project</h1>
        <p className="mt-1 text-sm text-muted-foreground">{project.name}’s name, ticket keys, boards, request form and repositories.</p>
      </header>
      {/* the same panels as Settings (TL-282): the quick ones three across, forms and lists full width */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SettingsCard icon={TypeIcon} title="Name" description="What everyone in your organization sees it called.">
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
        </SettingsCard>
        <SettingsCard icon={HashIcon} title="Ticket keys" description="Every ticket’s key starts with this, like TL-123.">
          <ProjectKeyPrefix project={project} token={token} editable={admin} onChanged={(key_prefix) => setProject((current) => current && { ...current, key_prefix })} />
        </SettingsCard>
        <SettingsCard icon={KanbanIcon} title="Boards"
          description={<>{project.boards?.length ?? 0} board{project.boards?.length === 1 ? '' : 's'}, one per team. To archive or delete one, open it and use Edit board.</>}>
          <NewBoardButton projectId={project.id} token={token} variant="outline" />
          <Link href={`/projects/${project.id}/archived`} className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline">Archived boards →</Link>
        </SettingsCard>
        <SettingsCard wide icon={InboxIcon} title="Request form" description="A public form for customers to suggest features and report bugs; you choose what reaches the backlog.">
          <IntakeSettingsSection projectId={project.id} token={token} />
        </SettingsCard>
        <SettingsCard wide icon={GitPullRequestIcon} title="Repositories" description="Pull requests in these repositories link to the tickets they mention, and merging one closes it.">
          <ProjectRepositories projectId={project.id} token={token} admin={admin} />
        </SettingsCard>
      </ul>
    </main>
  );
}

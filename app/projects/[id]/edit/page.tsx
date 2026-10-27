'use client';

import Link from 'next/link';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DownloadIcon, GlobeIcon, HashIcon, KanbanIcon, PlugIcon, TypeIcon, CalendarClockIcon } from 'lucide-react';
import { useFlags } from '@flags-gg/react-library';
import { GoogleChatSettings } from '@/components/settings/google-chat';
import { EmbeddingSettings } from '@/components/settings/embedding';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditableTitle } from '@/components/common/editable-title';
import { SettingsCard } from '@/components/settings/settings-card';
import { ProjectWorkingWeek } from '@/components/settings/working-week';
import { ListPageSkeleton } from '@/components/layout/page-skeletons';
import { ProjectKeyPrefix } from '@/components/project/key-prefix';
import { NewBoardButton } from '@/components/project/new-board';
import { ProjectRepositories } from '@/components/project/repositories';
import { IntakeSettingsSection } from '@/components/intake/intake-settings';
import { ExportCSVButton } from '@/components/project/export-csv';
import { organization, projects, type Project } from '@/lib/api';
import { useCachedState } from '@/lib/api/page-cache';
import { useToken } from '@/lib/hooks/use-token';

// Edit project: the project's setup, kept off its main page: name, ticket key prefix, more boards
// and linked repositories.
export default function EditProjectPage() {
  const { t } = useLingui();
  const { is } = useFlags();
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

  if (failed) return <p role="alert" className="p-8 text-destructive"><Trans>Couldn&apos;t load this project. Please refresh to try again.</Trans></p>;
  if (!project || !token) return <ListPageSkeleton label={t`Loading project…`} />;
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href={`/projects/${project.id}`} className="text-sm text-muted-foreground hover:underline">← {project.name}</Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Edit project</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>{project.name}’s name, ticket keys, boards, export, what people outside your organization can reach, and integrations.</Trans></p>
      </header>
      {/* the same panels as Settings (TL-282): the quick ones three across, forms and lists full width */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SettingsCard icon={TypeIcon} title={t`Name`} description={t`What everyone in your organization sees it called.`}>
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
        <SettingsCard icon={HashIcon} title={t`Ticket keys`} description={t`Every ticket’s key starts with this, like TL-123.`}>
          <ProjectKeyPrefix project={project} token={token} editable={admin} onChanged={(key_prefix) => setProject((current) => current && { ...current, key_prefix })} />
        </SettingsCard>
        <SettingsCard icon={KanbanIcon} title={t`Boards`}
          description={<Trans><Plural value={project.boards?.length ?? 0} one="# board" other="# boards" />, one per team. To archive or delete one, open it and use Edit board.</Trans>}>
          <NewBoardButton projectId={project.id} token={token} admin={admin} variant="outline" />
          <Link href={`/projects/${project.id}/archived`} className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"><Trans>Archived boards →</Trans></Link>
        </SettingsCard>
        <SettingsCard icon={DownloadIcon} title={t`Export`} description={t`Every ticket in the project, open and closed, as a CSV file for a spreadsheet or another tool.`}>
          <ExportCSVButton projectId={project.id} name={project.name} token={token} />
        </SettingsCard>
        {/* what people outside the org can reach (TL-685): the request form, and embedding it and the
            roadmaps on your own sites (the project's since TL-683, behind the flags.gg "embedding" flag) */}
        <SettingsCard wide icon={GlobeIcon} title={t`External`} description={t`What people outside your organization can reach: the request form, and this project’s roadmaps and form on your own sites.`}>
          <Tabs defaultValue="request">
            <TabsList>
              <TabsTrigger value="request"><Trans>Request form</Trans></TabsTrigger>
              {is('embedding').enabled() && <TabsTrigger value="embedding"><Trans>Embedding</Trans></TabsTrigger>}
            </TabsList>
            <TabsContent value="request" className="grid gap-3 pt-3">
              <p className="text-sm text-muted-foreground"><Trans>A public form for customers to suggest features and report bugs; you choose what reaches the backlog.</Trans></p>
              <IntakeSettingsSection projectId={project.id} token={token} />
            </TabsContent>
            {is('embedding').enabled() && (
              <TabsContent value="embedding" className="pt-3">
                <EmbeddingSettings projectId={project.id} />
              </TabsContent>
            )}
          </Tabs>
        </SettingsCard>
        <SettingsCard wide icon={CalendarClockIcon} title={t`Working week`} description={t`The organization’s, or this project’s own: for a team that works other days or hours.`}>
          <ProjectWorkingWeek token={token} projectId={project.id} canManage={admin} />
        </SettingsCard>
        <SettingsCard wide icon={PlugIcon} title={t`Integrations`} description={t`Other tools this project works with: its team’s Google Chat space, and the repositories whose pull requests link to its tickets.`}>
          <Tabs defaultValue="repos">
            <TabsList>
              <TabsTrigger value="chat">Google Chat</TabsTrigger>
              <TabsTrigger value="repos"><Trans>Repositories</Trans></TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="grid gap-3 pt-3">
              <p className="text-sm text-muted-foreground"><Trans>Post this project’s notifications into its team’s Google Chat space: new tickets, reviews, sprints over capacity and more.</Trans></p>
              <GoogleChatSettings token={token} projectId={project.id} canManage={admin} />
            </TabsContent>
            <TabsContent value="repos" className="grid gap-3 pt-3">
              <p className="text-sm text-muted-foreground"><Trans>Pull requests in these repositories link to the tickets they mention, and merging one closes it.</Trans></p>
              <ProjectRepositories projectId={project.id} token={token} admin={admin} />
            </TabsContent>
          </Tabs>
        </SettingsCard>
      </ul>
    </main>
  );
}

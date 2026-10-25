'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { LoadError } from '@/components/load-error';
import { RoadmapRow } from '@/components/project/roadmap-row';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WorkTabs } from '@/components/project/work-tabs';
import { BoardCard } from '@/components/project/board-card';
import { NewBoardButton } from '@/components/project/new-board';
import { RequestsLink } from '@/components/intake/requests-link';
import { ProjectReportLink } from '@/components/reports/report-links';
import { RoadmapEditorForm } from '@/components/roadmap-editor-form';
import { Button, buttonVariants } from '@/components/ui/button';
import { ApiError, boards, organization, projects, roadmaps, type Project } from '@/lib/api';
import { canManageRoadmaps } from '@/lib/board-access';
import { useToken } from '@/lib/use-token';
import { prefetch, useCachedState } from '@/lib/page-cache';
import { ProjectSkeleton } from '@/components/page-skeletons';
import { CopyButton } from '@/components/copy-link';
import { ExportCSVButton } from '@/components/project/export-csv';

export default function ProjectPage() {
  const { t } = useLingui();
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const [project, setProject] = useCachedState<Project>(`project:${id}`); // last-seen project shows instantly, then refreshes
  const [error, setError] = useState<number | null>(null);
  const [dialog, setDialog] = useState<'roadmap' | null>(null);
  const [role, setRole] = useState<{ admin: boolean; leads: string[] } | null>(null); // who can change roadmaps (TL-413)

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) projects.get(id, token).then(setProject, (e) => setError(e instanceof ApiError ? e.status : 500));
  }, [id, loaded]); // load once; token refreshes must not refetch
  useEffect(() => {
    if (loaded) organization.me(token).then(setRole, () => setRole(null)); // unknown = can't manage
  }, [loaded]);
  // its boards are the likely next click (one per team, so only a few)
  useEffect(() => {
    if (loaded) for (const b of project?.boards ?? []) prefetch(`board:${b.id}`, () => boards.get(b.id, token));
  }, [project?.id, loaded]);

  if (error) return <LoadError status={error} thing="project" />;
  if (!project || !token) return <ProjectSkeleton />;

  const boardList = project.boards ?? [];
  const roadmapList = project.roadmaps ?? [];
  const manageRoadmaps = canManageRoadmaps(role, boardList);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline"><Trans>← Projects</Trans></Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        {/* setup (name, key prefix, more boards, repositories) lives on its own page */}
        <span className="flex gap-2">
          <ProjectReportLink projectId={project.id} />
          <ExportCSVButton projectId={project.id} name={project.name} token={token} />
          <RequestsLink projectId={project.id} token={token} />
          <Link href={`/projects/${project.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}><Trans>Edit project</Trans></Link>
        </span>
      </div>
      {/* integrations (ChewedFeed, BugFixes) ask for this */}
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Trans>Project ID</Trans>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground select-all">{project.id}</code>
        <CopyButton value={project.id} label={t`Copy ID`} size="sm" ariaLabel={t`Copy project ID`} />
      </p>
      {project.description && <p className="mt-2 text-muted-foreground">{project.description}</p>}

      {/* past one board, adding more is setup: it moves to Edit project */}
      <Section title={t`Boards`} hint={t`One board per team.`} action={boardList.length <= 1 && <NewBoardButton projectId={project.id} token={token} admin={role?.admin ?? false} />}>
        {boardList.length === 0 ? (
          <Empty><Trans>No boards yet. Add one for each team, e.g. Backend, Design.</Trans></Empty>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boardList.map((b) => <BoardCard key={b.id} board={b} />)}
          </ul>
        )}
      </Section>

      {/* Backlog, Epics and Roadmaps as tabs, the Backlog open (TL-385, TL-386) */}
      <WorkTabs projectId={project.id} boards={boardList} token={token} roadmaps={
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <p className="text-sm text-muted-foreground"><Trans>Public roadmaps are readable by anyone you send the link to.</Trans></p>
            {manageRoadmaps && <Button variant="outline" onClick={() => setDialog('roadmap')}><Trans>New roadmap</Trans></Button>}
          </div>
          {roadmapList.length === 0 ? (
            <Empty><Trans>No roadmaps yet.</Trans></Empty>
          ) : (
            <ul className="divide-y rounded-xl border">
              {roadmapList.map((r) => <RoadmapRow key={r.id} roadmap={r} canManage={manageRoadmaps} />)}
            </ul>
          )}
        </section>
      } />

      <RoadmapEditorForm
        open={dialog === 'roadmap'}
        onOpenChange={(o) => !o && setDialog(null)}
        projectId={project.id}
        canPublish={role?.admin ?? false}
        onSubmit={async (r) => {
          const rm = await roadmaps.create(project.id, r, token).catch(() => { throw new Error(t`Couldn’t create the roadmap. Please try again.`); });
          setProject((p) => p && { ...p, roadmaps: [rm, ...(p.roadmaps ?? [])] });
        }}
      />
    </main>
  );
}


function Section({ title, hint, action, children }: { title: string; hint: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{children}</p>;
}

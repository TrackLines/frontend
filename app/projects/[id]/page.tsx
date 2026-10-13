'use client';

import Link from 'next/link';
import { LoadError } from '@/components/load-error';
import { RoadmapRow } from '@/components/project/roadmap-row';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Backlog } from '@/components/project/backlog';
import { BoardCard } from '@/components/project/board-card';
import { NewBoardButton } from '@/components/project/new-board';
import { RequestsLink } from '@/components/intake/requests-link';
import { RoadmapEditorForm } from '@/components/roadmap-editor-form';
import { Button, buttonVariants } from '@/components/ui/button';
import { ApiError, boards, projects, roadmaps, type Project } from '@/lib/api';
import { useToken } from '@/lib/use-token';
import { prefetch, useCachedState } from '@/lib/page-cache';
import { ProjectSkeleton } from '@/components/page-skeletons';
import { CopyButton } from '@/components/copy-link';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const [project, setProject] = useCachedState<Project>(`project:${id}`); // last-seen project shows instantly, then refreshes
  const [error, setError] = useState<number | null>(null);
  const [dialog, setDialog] = useState<'roadmap' | null>(null);

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) projects.get(id, token).then(setProject, (e) => setError(e instanceof ApiError ? e.status : 500));
  }, [id, loaded]); // load once; token refreshes must not refetch
  // its boards are the likely next click (one per team, so only a few)
  useEffect(() => {
    if (loaded) for (const b of project?.boards ?? []) prefetch(`board:${b.id}`, () => boards.get(b.id, token));
  }, [project?.id, loaded]);

  if (error) return <LoadError status={error} thing="project" />;
  if (!project || !token) return <ProjectSkeleton />;

  const boardList = project.boards ?? [];
  const roadmapList = project.roadmaps ?? [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← Projects</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        {/* setup (name, key prefix, more boards, repositories) lives on its own page */}
        <span className="flex gap-2">
          <RequestsLink projectId={project.id} token={token} />
          <Link href={`/projects/${project.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Edit project</Link>
        </span>
      </div>
      {/* integrations (ChewedFeed, BugFixes) ask for this */}
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        Project ID
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground select-all">{project.id}</code>
        <CopyButton value={project.id} label="Copy ID" size="sm" ariaLabel="Copy project ID" />
      </p>
      {project.description && <p className="mt-2 text-muted-foreground">{project.description}</p>}

      {/* past one board, adding more is setup: it moves to Edit project */}
      <Section title="Boards" hint="One board per team." action={boardList.length <= 1 && <NewBoardButton projectId={project.id} token={token} />}>
        {boardList.length === 0 ? (
          <Empty>No boards yet. Add one for each team, e.g. Backend, Design.</Empty>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boardList.map((b) => <BoardCard key={b.id} board={b} />)}
          </ul>
        )}
      </Section>

      <Backlog projectId={project.id} boards={boardList} token={token} />

      <Section title="Roadmaps" hint="Public roadmaps are readable by anyone you send the link to." action={<Button variant="outline" onClick={() => setDialog('roadmap')}>New roadmap</Button>}>
        {roadmapList.length === 0 ? (
          <Empty>No roadmaps yet.</Empty>
        ) : (
          <ul className="divide-y rounded-xl border">
            {roadmapList.map((r) => <RoadmapRow key={r.id} roadmap={r} />)}
          </ul>
        )}
      </Section>

      <RoadmapEditorForm
        open={dialog === 'roadmap'}
        onOpenChange={(o) => !o && setDialog(null)}
        projectId={project.id}
        onSubmit={async (r) => {
          const rm = await roadmaps.create(project.id, r, token).catch(() => { throw new Error('Couldn’t create the roadmap. Please try again.'); });
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

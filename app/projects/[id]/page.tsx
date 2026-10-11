'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NameDialog } from '@/components/name-dialog';
import { DEFAULT_TEMPLATE, TemplatePicker } from '@/components/board/template-picker';
import { EditableTitle } from '@/components/editable-title';
import { Backlog } from '@/components/project/backlog';
import { BoardCard } from '@/components/project/board-card';
import { RoadmapEditorForm } from '@/components/roadmap-editor-form';
import { VisibilityBadge } from '@/components/roadmap/visibility';
import { Button, buttonVariants } from '@/components/ui/button';
import { ApiError, boards, projects, roadmaps, type Project, type Roadmap } from '@/lib/api';
import { useToken } from '@/lib/use-token';
import { prefetch, useCachedState } from '@/lib/page-cache';
import { ProjectSkeleton } from '@/components/page-skeletons';
import { CopyButton } from '@/components/copy-link';
import { Input } from '@/components/ui/input';
import { organization } from '@/lib/api';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useToken();
  const [project, setProject] = useCachedState<Project>(`project:${id}`); // last-seen project shows instantly, then refreshes
  const [, setProjects] = useCachedState<Project[]>('projects');
  const [error, setError] = useState<number | null>(null);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [dialog, setDialog] = useState<'board' | 'roadmap' | null>(null);
  const [canEditKeyPrefix, setCanEditKeyPrefix] = useState(false);

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) projects.get(id, token).then(setProject, (e) => setError(e instanceof ApiError ? e.status : 500));
  }, [id, loaded]); // load once; token refreshes must not refetch
  useEffect(() => {
    if (loaded) organization.me(token).then((role) => setCanEditKeyPrefix(role.admin), () => setCanEditKeyPrefix(false));
  }, [loaded]);
  // its boards are the likely next click (one per team, so only a few)
  useEffect(() => {
    if (loaded) for (const b of project?.boards ?? []) prefetch(`board:${b.id}`, () => boards.get(b.id, token));
  }, [project?.id, loaded]);

  if (error === 404) return <Message title="Project not found" body="It may have been deleted, or it belongs to another organization." />;
  if (error) return <Message title="Couldn't load this project" body="Please refresh to try again." />;
  if (!project || !token) return <ProjectSkeleton />;

  const boardList = project.boards ?? [];
  const roadmapList = project.roadmaps ?? [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← Projects</Link>
      <div className="mt-2">
        <EditableTitle
          value={project.name}
          label="project"
          editable
          className="text-3xl font-bold tracking-tight"
          onSave={async (name) => {
            await projects.update(project.id, { name, description: project.description }, token);
            setProject((current) => current && { ...current, name });
            setProjects((current) => current?.map((item) => item.id === project.id ? { ...item, name } : item) ?? current);
          }}
        />
      </div>
      {/* integrations (ChewedFeed, BugFixes) ask for this */}
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        Project ID
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground select-all">{project.id}</code>
        <CopyButton value={project.id} label="Copy ID" size="sm" ariaLabel="Copy project ID" />
      </p>
      <ProjectKeyPrefix project={project} token={token} editable={canEditKeyPrefix} onChanged={(key_prefix) => setProject((current) => current && { ...current, key_prefix })} />
      {/* project setup lives on its own pages, not at the bottom of this one */}
      <p className="mt-2 text-sm">
        <Link href={`/projects/${project.id}/repositories`} className="font-medium text-muted-foreground hover:text-foreground hover:underline">Repositories →</Link>
      </p>
      {project.description && <p className="mt-2 text-muted-foreground">{project.description}</p>}

      <Section title="Boards" hint="One board per team." action={<Button onClick={() => setDialog('board')}>New board</Button>}>
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

      <NameDialog
        open={dialog === 'board'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="New board"
        description="Start from a template; you can change columns and settings afterwards."
        placeholder="e.g. Backend"
        submitLabel="Create board"
        onSubmit={async (name) => {
          const b = await boards.create(project.id, { name, template_id: template }, token).catch(() => { throw new Error('Couldn’t create the board. Please try again.'); });
          router.push(`/boards/${b.id}`);
        }}
      >
        {dialog === 'board' && <TemplatePicker value={template} onChange={setTemplate} token={token} />}
      </NameDialog>
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

function ProjectKeyPrefix({ project, token, editable, onChanged }: { project: Project; token: string; editable: boolean; onChanged: (prefix: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [prefix, setPrefix] = useState(project.key_prefix ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await projects.update(project.id, { name: project.name, description: project.description, key_prefix: prefix.trim().toUpperCase() }, token);
      onChanged(prefix.trim().toUpperCase());
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? 'That ticket prefix is already used by another project.'
        : err instanceof ApiError && err.status === 400 ? err.message : 'Couldn’t update the ticket prefix. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>Ticket key prefix</span>
      {!editing ? <><code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{project.key_prefix ?? '—'}</code>{editable && <Button type="button" variant="ghost" size="sm" onClick={() => { setPrefix(project.key_prefix ?? ''); setEditing(true); }}>Change</Button>}</> : (
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <Input aria-label="Ticket key prefix" value={prefix} onChange={(event) => setPrefix(event.target.value.toUpperCase())} minLength={2} maxLength={6} pattern="[A-Z][A-Z0-9]{1,5}" required className="w-24" />
          <span className="text-xs">2–6 letters or digits, starting with a letter. Existing keys will change.</span>
          <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save prefix'}</Button>
          <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => { setEditing(false); setError(''); }}>Cancel</Button>
          {error && <span role="alert" className="basis-full text-destructive">{error}</span>}
        </form>
      )}
    </div>
  );
}

function RoadmapRow({ roadmap }: { roadmap: Roadmap }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === 'undefined' ? `/r/${roadmap.id}` : `${window.location.origin}/r/${roadmap.id}`;
  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <span className="font-medium">{roadmap.title}</span>
      <VisibilityBadge value={roadmap.visibility} />
      <span className="ml-auto flex gap-2">
        <Link href={`/roadmaps/${roadmap.id}/edit`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Edit</Link>
        <Link href={`/r/${roadmap.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>View</Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
        >
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </span>
    </li>
  );
}

function Section({ title, hint, action, children }: { title: string; hint: string; action: React.ReactNode; children: React.ReactNode }) {
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

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>Back to projects</Link>
    </main>
  );
}

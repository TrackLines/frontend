'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { VisibilityBadge } from '@/components/roadmap/visibility';
import { Button, buttonVariants } from '@/components/ui/button';
import { projects, roadmaps, type Project, type Roadmap } from '@/lib/api';
import { useToken } from '@/lib/use-token';

type RoadmapEntry = { roadmap: Roadmap; project?: Project };

export default function RoadmapsPage() {
  const token = useToken();
  const [entries, setEntries] = useState<RoadmapEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loaded = token !== null;
  useEffect(() => {
    if (!loaded || !token) return;
    Promise.all([roadmaps.mine(token), projects.list(token)])
      .then(([list, projectList]) => {
        setEntries(list.map((roadmap) => ({
          roadmap,
          project: projectList.find((project) => project.id === roadmap.project_id),
        })));
      })
      .catch(() => setFailed(true));
  }, [loaded]); // load once; token refreshes must not refetch

  async function remove(roadmap: Roadmap) {
    if (!token || !confirm(`Delete “${roadmap.title}”? Its link stops working for everyone.`)) return;
    setDeletingId(roadmap.id);
    setDeleteError('');
    try {
      await roadmaps.remove(roadmap.id, token);
      setEntries((current) => current?.filter((entry) => entry.roadmap.id !== roadmap.id) ?? []);
    } catch {
      setDeleteError(`Could not delete “${roadmap.title}”. Please try again.`);
    } finally {
      setDeletingId(null);
    }
  }

  if (failed) return <Message title="Couldn't load your roadmaps" body="Please refresh to try again." />;
  if (!entries || !token) return <p className="p-8 text-muted-foreground" role="status">Loading roadmaps…</p>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">← Projects</Link>
      <header className="mb-8 mt-2">
        <h1 className="text-3xl font-bold tracking-tight">Roadmaps</h1>
        <p className="mt-2 text-muted-foreground">Your roadmaps across all projects. Public roadmaps are only available to others through their shared link.</p>
      </header>

      {deleteError && <p className="mb-4 text-sm text-destructive" role="alert">{deleteError}</p>}
      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">No roadmaps yet. Create one from a project.</p>
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>Browse projects</Link>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {entries.map(({ roadmap, project }) => (
            <li key={roadmap.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
              <div className="min-w-48 flex-1">
                <p className="font-medium">{roadmap.title}</p>
                <Link href={`/projects/${roadmap.project_id}`} className="text-sm text-muted-foreground hover:underline">
                  {project?.name ?? 'Project'}
                </Link>
              </div>
              <VisibilityBadge value={roadmap.visibility} />
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Link href={`/roadmaps/${roadmap.id}/edit`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Edit</Link>
                <Link href={`/r/${roadmap.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>View</Link>
                <CopyLink roadmap={roadmap} />
                <Button variant="ghost" size="sm" className="text-destructive" disabled={deletingId === roadmap.id} onClick={() => remove(roadmap)}>
                  {deletingId === roadmap.id ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function CopyLink({ roadmap }: { roadmap: Roadmap }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    setFailed(false);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/r/${roadmap.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
      {failed && <span role="status" className="text-xs text-destructive">Could not copy</span>}
    </span>
  );
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

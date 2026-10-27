'use client';

import { ListPageSkeleton } from '@/components/layout/page-skeletons';
import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Pager } from '@/components/common/pager';
import { VisibilityBadge } from '@/components/roadmap/visibility';
import { Button, buttonVariants } from '@/components/ui/button';
import { projects, roadmaps, type Project, type Roadmap } from '@/lib/api';
import { useIsAdmin } from '@/lib/hooks/use-is-admin';
import { useToken } from '@/lib/hooks/use-token';

type RoadmapEntry = { roadmap: Roadmap; project?: Project };

const PER_PAGE = 10; // ponytail: pages in the browser; the list is the org's roadmaps, small enough to load at once

export default function RoadmapsPage() {
  const { t } = useLingui();
  const token = useToken();
  const [entries, setEntries] = useState<RoadmapEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const admin = useIsAdmin(token); // deleting: org admins only (TL-432)

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
    const name = roadmap.title;
    if (!token || !confirm(t`Delete “${name}”? Its link stops working for everyone.`)) return;
    setDeletingId(roadmap.id);
    setDeleteError('');
    try {
      await roadmaps.remove(roadmap.id, token);
      setEntries((current) => current?.filter((entry) => entry.roadmap.id !== roadmap.id) ?? []);
    } catch {
      setDeleteError(t`Could not delete “${name}”. Please try again.`);
    } finally {
      setDeletingId(null);
    }
  }

  if (failed) return <Message title={t`Couldn't load your roadmaps`} body={t`Please refresh to try again.`} />;
  if (!entries || !token) return <ListPageSkeleton label={t`Loading roadmaps…`} />;
  const lastPage = Math.max(1, Math.ceil(entries.length / PER_PAGE));
  const current = Math.min(page, lastPage); // e.g. the last roadmap on the last page was deleted

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline"><Trans>← Projects</Trans></Link>
      <header className="mb-8 mt-2">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Roadmaps</Trans></h1>
        <p className="mt-2 text-muted-foreground"><Trans>Your roadmaps across all projects. Public roadmaps are only available to others through their shared link.</Trans></p>
      </header>

      {deleteError && <p className="mb-4 text-sm text-destructive" role="alert">{deleteError}</p>}
      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground"><Trans>No roadmaps yet. Create one from a project.</Trans></p>
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}><Trans>Browse projects</Trans></Link>
        </div>
      ) : (
        <ul id="roadmaps" className="divide-y rounded-xl border">
          {entries.slice((current - 1) * PER_PAGE, current * PER_PAGE).map(({ roadmap, project }) => (
            <li key={roadmap.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
              <div className="min-w-48 flex-1">
                <p className="font-medium">{roadmap.title}</p>
                <Link href={`/projects/${roadmap.project_id}`} className="text-sm text-muted-foreground hover:underline">
                  {project?.name ?? t`Project`}
                </Link>
              </div>
              <VisibilityBadge value={roadmap.visibility} />
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Link href={`/roadmaps/${roadmap.id}/edit`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}><Trans>Edit</Trans></Link>
                <Link href={`/r/${roadmap.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}><Trans>View</Trans></Link>
                <CopyLink roadmap={roadmap} />
                {admin && (
                  <Button variant="ghost" size="sm" className="text-destructive" disabled={deletingId === roadmap.id} onClick={() => remove(roadmap)}>
                    {deletingId === roadmap.id ? t`Deleting…` : t`Delete`}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager page={current} lastPage={lastPage} onPage={setPage} anchor="#roadmaps" />
    </main>
  );
}

function CopyLink({ roadmap }: { roadmap: Roadmap }) {
  const { t } = useLingui();
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
      <Button variant="ghost" size="sm" onClick={copy}>{copied ? t`Copied` : t`Copy link`}</Button>
      {failed && <span role="status" className="text-xs text-destructive"><Trans>Could not copy</Trans></span>}
    </span>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{body}</p>
      <Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}><Trans>Back to projects</Trans></Link>
    </main>
  );
}

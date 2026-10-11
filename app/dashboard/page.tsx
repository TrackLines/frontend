'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NameDialog } from '@/components/name-dialog';
import { ProjectCard } from '@/components/project/project-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loading } from '@/components/page-skeletons';
import { FolderKanbanIcon, PlusIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiError, billing, projects, type Project } from '@/lib/api';
import { useToken } from '@/lib/use-token';
import { useCachedState } from '@/lib/page-cache';

// Signed-in home: your projects. A project holds a board per team plus its roadmaps.
export default function Dashboard() {
  const router = useRouter();
  const token = useToken();
  const [list, setList] = useCachedState<Project[]>('projects'); // last-seen list shows instantly, then refreshes
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [atLimit, setAtLimit] = useState(false);

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) projects.list(token).then(setList, () => setFailed(true));
  }, [loaded]); // load once; token refreshes must not refetch

  async function create(name: string) {
    try {
      const p = await projects.create({ name }, token);
      router.push(`/projects/${p.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setCreating(false);
        setAtLimit(true);
        return;
      }
      throw new Error('Couldn’t create the project. Please try again.');
    }
  }

  if (failed) return <p className="p-8 text-destructive" role="alert">Couldn&apos;t load your projects. Please refresh to try again.</p>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everyone in your organization sees these.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/roadmaps" className={buttonVariants({ variant: 'ghost' })}>Roadmaps</Link>
          <Link href="/settings" className={buttonVariants({ variant: 'ghost' })}>Settings</Link>
          <Button onClick={() => setCreating(true)} disabled={!token}><PlusIcon />New project</Button>
        </div>
      </header>
      {!list ? (
        <Loading label="Loading projects…" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </Loading>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <FolderKanbanIcon className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">Start your first project</h2>
          <p className="mx-auto mt-1 mb-6 max-w-md text-sm text-muted-foreground">A project holds a board for each team, a shared backlog, and the roadmaps you send to customers.</p>
          <Button onClick={() => setCreating(true)} disabled={!token}>Create a project</Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => <ProjectCard key={p.id} project={p} />)}
        </ul>
      )}
      {token && (
        <>
          <NameDialog
            open={creating}
            onOpenChange={setCreating}
            title="New project"
            description="You can add a board for each team inside it."
            placeholder="e.g. Website relaunch"
            submitLabel="Create project"
            onSubmit={create}
          />
          <Upgrade open={atLimit} onOpenChange={setAtLimit} token={token} />
        </>
      )}
    </main>
  );
}

function Upgrade({ open, onOpenChange, token }: { open: boolean; onOpenChange: (o: boolean) => void; token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function upgrade() {
    setBusy(true);
    try {
      window.location.href = (await billing.checkout(token)).url;
    } catch {
      setError('Upgrades are unavailable right now. Please try again later.');
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your free plan includes one project</DialogTitle>
          <DialogDescription>Add as many team boards and roadmaps as you like inside it, or upgrade for unlimited projects.</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Not now</Button>
          <Button onClick={upgrade} disabled={busy}>{busy ? 'Opening checkout…' : 'Upgrade'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

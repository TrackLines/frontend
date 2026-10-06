'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NameDialog } from '@/components/name-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiError, billing, projects, type Project } from '@/lib/api';
import { useToken } from '@/lib/use-token';

// Signed-in home: your projects. A project holds a board per team plus its roadmaps.
export default function Dashboard() {
  const router = useRouter();
  const token = useToken();
  const [list, setList] = useState<Project[] | null>(null);
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
  if (!list || !token) return <p className="p-8 text-muted-foreground" role="status">Loading projects…</p>;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <div className="flex items-center gap-2">
          <Link href="/roadmaps" className={buttonVariants({ variant: 'ghost' })}>Roadmaps</Link>
          <Link href="/settings" className={buttonVariants({ variant: 'ghost' })}>Settings</Link>
          <Button onClick={() => setCreating(true)}>New project</Button>
        </div>
      </header>
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="mb-4 text-muted-foreground">No projects yet. A project holds a board for each team and the roadmaps you share.</p>
          <Button onClick={() => setCreating(true)}>Create your first project</Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
                <Card className="h-full transition-colors hover:bg-muted/40">
                  <CardHeader>
                    <CardTitle>{p.name}</CardTitle>
                    {p.description && <CardDescription className="line-clamp-2">{p.description}</CardDescription>}
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
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

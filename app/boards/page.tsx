'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError, billing, boards, type Board } from '@/lib/api';
import { useToken } from '@/lib/use-token';

export default function BoardsPage() {
  const token = useToken();
  const [list, setList] = useState<Board[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) boards.list(token).then(setList, () => setFailed(true));
  }, [loaded]); // load once; token refreshes must not refetch

  if (failed) return <p className="p-8 text-destructive" role="alert">Couldn&apos;t load your boards. Please refresh to try again.</p>;
  if (!list || !token) return <p className="p-8 text-muted-foreground" role="status">Loading boards…</p>;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Boards</h1>
        <Button onClick={() => setCreating(true)}>New board</Button>
      </header>
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="mb-4 text-muted-foreground">No boards yet. A board comes with To do, In progress and Done columns.</p>
          <Button onClick={() => setCreating(true)}>Create your first board</Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <li key={b.id}>
              <Link href={`/boards/${b.id}`} className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
                <Card className="h-full transition-colors hover:bg-muted/40">
                  <CardHeader>
                    <CardTitle>{b.name}</CardTitle>
                    {b.description && <CardDescription className="line-clamp-2">{b.description}</CardDescription>}
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CreateBoard open={creating} onOpenChange={setCreating} token={token} />
    </main>
  );
}

function CreateBoard({ open, onOpenChange, token }: { open: boolean; onOpenChange: (o: boolean) => void; token: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [atLimit, setAtLimit] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const b = await boards.create({ name: name.trim() }, token);
      router.push(`/boards/${b.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) setAtLimit(true);
      else setError('Couldn’t create the board. Please try again.');
      setSaving(false);
    }
  }

  async function upgrade() {
    setSaving(true);
    try {
      window.location.href = (await billing.checkout(token)).url;
    } catch {
      setError('Upgrades are unavailable right now. Please try again later.');
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setAtLimit(false); setError(''); } }}>
      <DialogContent>
        {atLimit ? (
          <>
            <DialogHeader>
              <DialogTitle>Your free plan includes one board</DialogTitle>
              <DialogDescription>Upgrade for unlimited boards. Roadmaps stay unlimited on every plan.</DialogDescription>
            </DialogHeader>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Not now</Button>
              <Button onClick={upgrade} disabled={saving}>{saving ? 'Opening checkout…' : 'Upgrade'}</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>New board</DialogTitle>
              <DialogDescription>You can rename columns and add more later.</DialogDescription>
            </DialogHeader>
            <Input autoFocus required maxLength={120} placeholder="e.g. Website relaunch" value={name} onChange={(e) => setName(e.target.value)} />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={saving || !name.trim()}>{saving ? 'Creating…' : 'Create board'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

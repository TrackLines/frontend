'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ItemEditor } from '@/components/roadmap/item-editor';
import { VisibilitySelect } from '@/components/roadmap/visibility';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, roadmaps, type Roadmap, type Visibility } from '@/lib/api';
import { useToken } from '@/lib/use-token';

export default function EditRoadmapPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [error, setError] = useState<number | null>(null);

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) roadmaps.get(id, token).then(setRoadmap, (e) => setError(e instanceof ApiError ? e.status : 500));
  }, [id, loaded]); // load once; token refreshes must not refetch

  if (error === 404 || error === 403) return <Message title="Roadmap not found" body="It may have been deleted, or it isn't yours." />;
  if (error) return <Message title="Couldn't load this roadmap" body="Please refresh to try again." />;
  if (!roadmap || !token) return <p className="p-8 text-muted-foreground" role="status">Loading roadmap…</p>;

  return (
    <main className="mx-auto grid max-w-3xl gap-10 px-6 py-10">
      <div>
        <Link href={`/projects/${roadmap.project_id}`} className="text-sm text-muted-foreground hover:underline">← Project</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Edit roadmap</h1>
          <Link href={`/r/${roadmap.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>View</Link>
        </div>
      </div>
      <Details roadmap={roadmap} token={token} onSaved={setRoadmap} />
      <ItemEditor roadmapId={roadmap.id} items={roadmap.items ?? []} token={token} />
      <DangerZone roadmap={roadmap} token={token} />
    </main>
  );
}

function Details({ roadmap, token, onSaved }: { roadmap: Roadmap; token: string; onSaved: (r: Roadmap) => void }) {
  const [title, setTitle] = useState(roadmap.title);
  const [description, setDescription] = useState(roadmap.description);
  const [visibility, setVisibility] = useState<Visibility>(roadmap.visibility);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    const next = { title: title.trim(), description: description.trim(), visibility };
    try {
      await roadmaps.update(roadmap.id, next, token);
      onSaved({ ...roadmap, ...next });
      setMessage('Details saved.');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? 'You can only edit your own roadmaps.' : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} aria-labelledby="details-heading" className="grid gap-4">
      <h2 id="details-heading" className="text-lg font-semibold">Details</h2>
      <label className="grid gap-1.5 text-sm font-medium">
        Title
        <Input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Description <span className="font-normal text-muted-foreground">(optional)</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <VisibilitySelect name="visibility" value={visibility} onChange={setVisibility} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving || !title.trim()}>{saving ? 'Saving…' : 'Save details'}</Button>
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </form>
  );
}

function DangerZone({ roadmap, token }: { roadmap: Roadmap; token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove() {
    if (!confirm(`Delete “${roadmap.title}”? Its link stops working for everyone.`)) return;
    setBusy(true);
    try {
      await roadmaps.remove(roadmap.id, token);
      router.push(`/projects/${roadmap.project_id}`);
    } catch {
      setError('Could not delete the roadmap. Please try again.');
      setBusy(false);
    }
  }
  return (
    <section className="rounded-xl border border-destructive/30 p-5">
      <h2 className="font-semibold">Delete roadmap</h2>
      <p className="mt-1 text-sm text-muted-foreground">Removes it and its items; the shared link stops working.</p>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      <Button variant="destructive" className="mt-3" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete roadmap'}</Button>
    </section>
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

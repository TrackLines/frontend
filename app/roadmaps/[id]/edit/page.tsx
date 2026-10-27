'use client';

import { Textarea } from '@/components/ui/textarea';
import { FormPageSkeleton } from '@/components/layout/page-skeletons';
import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { LoadError } from '@/components/layout/load-error';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ItemEditor } from '@/components/roadmap/item-editor';
import { RoadmapUpdates } from '@/components/roadmap/updates';
import { VisibilitySelect } from '@/components/roadmap/visibility';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, roadmaps, type Roadmap, type Visibility } from '@/lib/api';
import { useIsAdmin } from '@/lib/hooks/use-is-admin';
import { useToken } from '@/lib/hooks/use-token';

export default function EditRoadmapPage() {
  const { t } = useLingui();
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [error, setError] = useState<number | null>(null);
  const admin = useIsAdmin(token) ?? false; // publishing and deleting: org admins only (TL-432)

  const loaded = token !== null;
  useEffect(() => {
    if (loaded) roadmaps.get(id, token).then(setRoadmap, (e) => setError(e instanceof ApiError ? e.status : 500));
  }, [id, loaded]); // load once; token refreshes must not refetch

  if (error) return <LoadError status={error} thing="roadmap" />;
  if (!roadmap || !token) return <FormPageSkeleton label={t`Loading roadmap…`} />;
  if (!roadmap.can_manage) return <NotAManager roadmap={roadmap} />;

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-6 py-10">
      <div>
        <Link href={`/projects/${roadmap.project_id}`} className="text-sm text-muted-foreground hover:underline"><Trans>← Project</Trans></Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight"><Trans>Edit roadmap</Trans></h1>
          <Link href={`/r/${roadmap.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}><Trans>View</Trans></Link>
        </div>
      </div>
      <Details roadmap={roadmap} token={token} onSaved={setRoadmap} canPublish={admin} />
      <ItemEditor roadmapId={roadmap.id} projectId={roadmap.project_id} items={roadmap.items ?? []} token={token} />
      <RoadmapUpdates roadmapId={roadmap.id} token={token} canManage />
      {admin && <DangerZone roadmap={roadmap} token={token} />}
    </main>
  );
}

// NotAManager: roadmaps are changed by org admins and the project's team leaders (TL-413).
export function NotAManager({ roadmap }: { roadmap: Pick<Roadmap, 'id' | 'project_id'> }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight"><Trans>Edit roadmap</Trans></h1>
      <p className="mt-4 text-muted-foreground"><Trans>Only organization admins and this project’s team leaders can change its roadmaps.</Trans></p>
      <div className="mt-6 flex gap-3">
        <Link href={`/r/${roadmap.id}`} className={buttonVariants({ variant: 'outline' })}><Trans>View the roadmap</Trans></Link>
        <Link href={`/projects/${roadmap.project_id}`} className={buttonVariants({ variant: 'ghost' })}><Trans>Back to the project</Trans></Link>
      </div>
    </main>
  );
}

function Details({ roadmap, token, onSaved, canPublish }: { roadmap: Roadmap; token: string; onSaved: (r: Roadmap) => void; canPublish: boolean }) {
  const { t } = useLingui();
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
      setMessage(t`Details saved.`);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? t`You can only edit your own roadmaps.` : t`Could not save. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} aria-labelledby="details-heading" className="grid gap-4">
      <h2 id="details-heading" className="text-lg font-semibold"><Trans>Details</Trans></h2>
      <label className="grid gap-1.5 text-sm font-medium">
        <Trans>Title</Trans>
        <Input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        <span><Trans>Description <span className="font-normal text-muted-foreground">(optional)</span></Trans></span>
        <Textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <VisibilitySelect name="visibility" value={visibility} onChange={setVisibility} canPublish={canPublish} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving || !title.trim()}>{saving ? t`Saving…` : t`Save details`}</Button>
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </form>
  );
}

function DangerZone({ roadmap, token }: { roadmap: Roadmap; token: string }) {
  const { t } = useLingui();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove() {
    const name = roadmap.title;
    if (!confirm(t`Delete “${name}”? Its link stops working for everyone.`)) return;
    setBusy(true);
    try {
      await roadmaps.remove(roadmap.id, token);
      router.push(`/projects/${roadmap.project_id}`);
    } catch {
      setError(t`Could not delete the roadmap. Please try again.`);
      setBusy(false);
    }
  }
  return (
    <section className="rounded-xl border border-destructive/30 p-5">
      <h2 className="font-semibold"><Trans>Delete roadmap</Trans></h2>
      <p className="mt-1 text-sm text-muted-foreground"><Trans>Removes it and its items; the shared link stops working.</Trans></p>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      <Button variant="destructive" className="mt-3" disabled={busy} onClick={remove}>{busy ? t`Deleting…` : t`Delete roadmap`}</Button>
    </section>
  );
}

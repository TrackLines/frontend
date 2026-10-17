'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { When } from '@/components/when';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, roadmaps, type RoadmapHealth, type RoadmapUpdate } from '@/lib/api';

// Roadmap updates (TL-87): a dated note with a health, posted by an org admin or one of the project's
// team leaders, read by anyone who can read the roadmap (public ones without signing in).

export const HEALTH: Record<RoadmapHealth, { label: string; variant: 'secondary' | 'outline' | 'destructive' }> = {
  on_track: { label: 'On track', variant: 'secondary' },
  at_risk: { label: 'At risk', variant: 'outline' },
  off_track: { label: 'Off track', variant: 'destructive' },
};

export const MAX_NOTE = 2000; // backend roadmaps.MaxUpdateNoteRunes

export const HealthBadge = ({ health }: { health: RoadmapHealth }) => <Badge variant={HEALTH[health].variant}>{HEALTH[health].label}</Badge>;

// newestFirst: the API lists updates oldest first; people read the latest first.
export const newestFirst = (updates: RoadmapUpdate[]) => [...updates].reverse();

// UpdatesTimeline: pure, for tests and the server-rendered public page.
export function UpdatesTimeline({ updates }: { updates: RoadmapUpdate[] }) {
  if (updates.length === 0) return <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No updates yet.</p>;
  return (
    <ol aria-label="Updates" className="grid gap-4">
      {newestFirst(updates).map((u) => (
        <li key={u.id} className="grid gap-2 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <HealthBadge health={u.health} />
            <When iso={u.published_at} />
            {u.author && <span>· {u.author}</span>}
          </div>
          <p className="whitespace-pre-line">{u.note}</p>
        </li>
      ))}
    </ol>
  );
}

// UpdateComposer: post a new update. Updates are permanent, so it says so before you post.
export function UpdateComposer({ roadmapId, token, onPosted }: { roadmapId: string; token: string; onPosted: (u: RoadmapUpdate) => void }) {
  const [health, setHealth] = useState<RoadmapHealth>('on_track');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function post(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onPosted(await roadmaps.postUpdate(roadmapId, { health, note: note.trim() }, token));
      setNote('');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'Only organization admins and this project’s team leaders can post updates.' : 'Couldn’t post the update. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={post} aria-label="Post an update" className="grid gap-3 rounded-lg border p-4">
      <label className="grid max-w-xs gap-1.5 text-sm font-medium">
        Health
        <Select items={Object.fromEntries(Object.entries(HEALTH).map(([k, v]) => [k, v.label]))} value={health} onValueChange={(v) => v && setHealth(v as RoadmapHealth)}>
          <SelectTrigger aria-label="Health"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(HEALTH) as RoadmapHealth[]).map((h) => <SelectItem key={h} value={h}>{HEALTH[h].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Note
        <Textarea required rows={3} maxLength={MAX_NOTE} value={note} placeholder="What's changed since the last update?" onChange={(e) => setNote(e.target.value)} />
      </label>
      <p className="text-xs text-muted-foreground">Everyone who can read this roadmap sees the update, with your name. It can’t be edited or deleted once posted.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || !note.trim()}>{busy ? 'Posting…' : 'Post update'}</Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </form>
  );
}

// RoadmapUpdates: the edit page's section: post (if you can manage the roadmap), then the history.
export function RoadmapUpdates({ roadmapId, token, canManage }: { roadmapId: string; token: string; canManage: boolean }) {
  const [updates, setUpdates] = useState<RoadmapUpdate[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { roadmaps.updates(roadmapId, token).then(setUpdates, () => setFailed(true)); }, [roadmapId]); // token refreshes must not refetch
  return (
    <section aria-labelledby="updates-heading" className="grid gap-4">
      <div>
        <h2 id="updates-heading" className="text-lg font-semibold">Updates</h2>
        <p className="text-sm text-muted-foreground">Short, dated notes on how the roadmap is going, shown on the roadmap with the newest first.</p>
      </div>
      {canManage && <UpdateComposer roadmapId={roadmapId} token={token} onPosted={(u) => setUpdates((cur) => [...(cur ?? []), u])} />}
      {failed ? <p role="alert" className="text-sm text-destructive">Couldn’t load the updates. Please refresh to try again.</p>
        : updates === null ? <p role="status" className="text-sm text-muted-foreground">Loading updates…</p>
        : <UpdatesTimeline updates={updates} />}
    </section>
  );
}

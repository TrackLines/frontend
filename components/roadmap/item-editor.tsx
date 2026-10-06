'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RoadmapItem } from '@/lib/api';
import { roadmaps } from '@/lib/api';
import { ItemTickets } from './item-tickets';

type DraftItem = Pick<RoadmapItem, 'title' | 'description' | 'target_date' | 'start_date' | 'manual_status'> & { key: string };

type Props = {
  roadmapId: string;
  projectId: string; // for the linked-tickets picker
  items: RoadmapItem[];
  token: string;
};

const toDrafts = (items: RoadmapItem[]): DraftItem[] =>
  items.map(({ id, title, description, target_date, start_date, manual_status }) => ({ key: id, title, description, target_date, start_date, manual_status: manual_status ?? 'not_started' }));

export function ItemEditor({ roadmapId, projectId, items, token }: Props) {
  const [saved, setSaved] = useState<RoadmapItem[]>(items); // server copy: real ids + linked tickets
  const [drafts, setDrafts] = useState<DraftItem[]>(() => toDrafts(items));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function update(index: number, patch: Partial<Omit<DraftItem, 'key'>>) {
    setDrafts((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function move(index: number, offset: number) {
    setDrafts((current) => {
      const nextIndex = index + offset;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function save() {
    if (drafts.some((item) => !item.title.trim())) {
      setError('Add a title to each roadmap item before saving.');
      setMessage('');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await roadmaps.setItems(
        roadmapId,
        drafts.map(({ key, title, description, target_date, start_date, manual_status }) => ({
          start_date: start_date || null, // carried through so saves never wipe it (input comes with T-032C)
          manual_status,
          id: key, // existing items keep their id (and linked tickets); new keys are created as new items
          title: title.trim(),
          description: description.trim(),
          target_date: target_date || null,
        })),
        token,
      );
      const fresh = (await roadmaps.get(roadmapId, token)).items ?? [];
      setSaved(fresh);
      setDrafts(toDrafts(fresh));
      setMessage('Roadmap items saved.');
    } catch {
      setError('Could not save roadmap items. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="roadmap-items-heading" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="roadmap-items-heading" className="text-lg font-semibold">Roadmap items</h2>
          <p className="text-sm text-muted-foreground">Add milestones and arrange them in the order you want people to read.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => setDrafts((current) => [
          ...current,
          { key: crypto.randomUUID(), title: '', description: '', target_date: null, manual_status: 'not_started' },
        ])}>
          Add item
        </Button>
      </div>

      {drafts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
          No milestones yet. Add an item to start your roadmap.
        </p>
      ) : (
        <ol className="grid gap-3">
          {drafts.map((item, index) => (
            <li key={item.key} className="grid gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium">Milestone {index + 1}</h3>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" aria-label={`Move milestone ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>Move up</Button>
                  <Button type="button" variant="ghost" size="sm" aria-label={`Move milestone ${index + 1} down`} disabled={index === drafts.length - 1} onClick={() => move(index, 1)}>Move down</Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}>Remove</Button>
                </div>
              </div>
              <label className="grid gap-1.5 text-sm font-medium">
                Title
                <Input value={item.title} maxLength={200} required placeholder="e.g. Invite your team" onChange={(event) => update(index, { title: event.target.value })} />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
                <textarea
                  value={item.description}
                  maxLength={4000}
                  rows={3}
                  placeholder="What will be included in this milestone?"
                  onChange={(event) => update(index, { description: event.target.value })}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="grid gap-1.5 text-sm font-medium">
                  Start date <span className="font-normal text-muted-foreground">(optional)</span>
                  <Input type="date" value={item.start_date ?? ''} max={item.target_date ?? undefined} onChange={(event) => update(index, { start_date: event.target.value || null })} />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Target date <span className="font-normal text-muted-foreground">(optional)</span>
                  <Input type="date" value={item.target_date ?? ''} min={item.start_date ?? undefined} onChange={(event) => update(index, { target_date: event.target.value || null })} />
                </label>
              </div>
              <label className="grid max-w-xs gap-1.5 text-sm font-medium">
                Manual status <span className="font-normal text-muted-foreground">(used when no tickets are linked)</span>
                <Select
                  items={{ not_started: 'Not started', in_progress: 'In progress', done: 'Done' }}
                  value={item.manual_status ?? 'not_started'}
                  onValueChange={(value) => value && update(index, { manual_status: String(value) as DraftItem['manual_status'] })}
                >
                  <SelectTrigger aria-label={`Manual status for milestone ${index + 1}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not started</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              {(() => {
                const s = saved.find((x) => x.id === item.key);
                return s ? (
                  <ItemTickets key={s.id} roadmapId={roadmapId} itemId={s.id} projectId={projectId} initial={s.tickets ?? []} token={token} />
                ) : (
                  <p className="text-sm text-muted-foreground">Save items to link tickets to this milestone.</p>
                );
              })()}
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save items'}</Button>
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </section>
  );
}

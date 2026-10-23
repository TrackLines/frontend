'use client';

import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RoadmapItem } from '@/lib/api';
import { roadmaps } from '@/lib/api';
import { ItemTickets } from './item-tickets';

export type DraftItem = Pick<RoadmapItem, 'title' | 'description' | 'target_date' | 'start_date' | 'manual_status'> & { key: string };

type Props = {
  roadmapId: string;
  projectId: string; // for the linked-tickets picker
  items: RoadmapItem[];
  token: string;
};

export const toDrafts = (items: RoadmapItem[]): DraftItem[] =>
  items.map(({ id, title, description, target_date, start_date, manual_status }) => ({ key: id, title, description, target_date, start_date, manual_status: manual_status ?? 'not_started' }));

// moveDraft swaps item index with its neighbour (offset -1 up, +1 down); off either end changes nothing.
export function moveDraft<T>(list: T[], index: number, offset: number): T[] {
  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= list.length) return list;
  const next = [...list];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

// toPayload is what Save sends: trimmed text, empty dates as null, existing items keep their id (and
// linked tickets), new ones get created.
export const toPayload = (drafts: DraftItem[]) => drafts.map(({ key, title, description, target_date, start_date, manual_status }) => ({
  start_date: start_date || null, manual_status, id: key, title: title.trim(), description: description.trim(), target_date: target_date || null,
}));

const STATUS_LABEL = { not_started: msg`Not started`, in_progress: msg`In progress`, done: msg`Done` };

// itemStatus: what a milestone shows, the same rule as the server (roadmaps.DeriveItemStatus): from its
// linked tickets once it has any, else the manual status.
export function itemStatus(manual: DraftItem['manual_status'], progress: { done: number; total: number } | undefined): keyof typeof STATUS_LABEL {
  if (!progress || progress.total === 0) return manual ?? 'not_started';
  if (progress.done <= 0) return 'not_started';
  return progress.done >= progress.total ? 'done' : 'in_progress';
}

export function ItemEditor({ roadmapId, projectId, items, token }: Props) {
  const { t, i18n } = useLingui();
  const [saved, setSaved] = useState<RoadmapItem[]>(items); // server copy: real ids + linked tickets
  const [drafts, setDrafts] = useState<DraftItem[]>(() => toDrafts(items));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // linked tickets' progress per saved milestone, kept current as tickets are linked (TL-412)
  const [progress, setProgress] = useState<Record<string, { done: number; total: number }>>(
    () => Object.fromEntries(items.flatMap((i) => (i.progress ? [[i.id, i.progress]] : []))));
  const [added, setAdded] = useState<string | null>(null); // a milestone just added: scroll to it

  // Add item puts the new milestone at the bottom: take you there and into its title (TL-412)
  useEffect(() => {
    if (!added) return;
    const el = document.getElementById(`milestone-${added}`);
    el?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    el?.querySelector('input')?.focus({ preventScroll: true });
    setAdded(null);
  }, [added]);

  function update(index: number, patch: Partial<Omit<DraftItem, 'key'>>) {
    setDrafts((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function move(index: number, offset: number) {
    setDrafts((current) => moveDraft(current, index, offset));
  }

  async function save() {
    if (drafts.some((item) => !item.title.trim())) {
      setError(t`Add a title to each roadmap item before saving.`);
      setMessage('');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await roadmaps.setItems(roadmapId, toPayload(drafts), token);
      const fresh = (await roadmaps.get(roadmapId, token)).items ?? [];
      setSaved(fresh);
      setProgress(Object.fromEntries(fresh.flatMap((i) => (i.progress ? [[i.id, i.progress]] : []))));
      setDrafts(toDrafts(fresh));
      setMessage(t`Roadmap items saved.`);
    } catch {
      setError(t`Could not save roadmap items. Check your connection and try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="roadmap-items-heading" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="roadmap-items-heading" className="text-lg font-semibold"><Trans>Roadmap items</Trans></h2>
          <p className="text-sm text-muted-foreground"><Trans>Add milestones and arrange them in the order you want people to read.</Trans></p>
        </div>
        <Button type="button" variant="outline" onClick={() => {
          const key = crypto.randomUUID();
          setDrafts((current) => [...current, { key, title: '', description: '', target_date: null, manual_status: 'not_started' }]);
          setAdded(key);
        }}>
          <Trans>Add item</Trans>
        </Button>
      </div>

      {drafts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
          <Trans>No milestones yet. Add an item to start your roadmap.</Trans>
        </p>
      ) : (
        <ol className="grid gap-3">
          {drafts.map((item, index) => { const n = index + 1; return (
            <li key={item.key} id={`milestone-${item.key}`} className="grid scroll-mt-4 gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium"><Trans>Milestone {n}</Trans></h3>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" aria-label={t`Move milestone ${n} up`} disabled={index === 0} onClick={() => move(index, -1)}><Trans>Move up</Trans></Button>
                  <Button type="button" variant="ghost" size="sm" aria-label={t`Move milestone ${n} down`} disabled={index === drafts.length - 1} onClick={() => move(index, 1)}><Trans>Move down</Trans></Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}><Trans>Remove</Trans></Button>
                </div>
              </div>
              <label className="grid gap-1.5 text-sm font-medium">
                <Trans>Title</Trans>
                <Input value={item.title} maxLength={200} required placeholder={t`e.g. Invite your team`} onChange={(event) => update(index, { title: event.target.value })} />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                <span><Trans>Description <span className="font-normal text-muted-foreground">(optional)</span></Trans></span>
                <Textarea
                  value={item.description}
                  maxLength={4000}
                  rows={3}
                  placeholder={t`What will be included in this milestone?`}
                  onChange={(event) => update(index, { description: event.target.value })}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="grid gap-1.5 text-sm font-medium">
                  <span><Trans>Start date <span className="font-normal text-muted-foreground">(optional)</span></Trans></span>
                  <Input type="date" value={item.start_date ?? ''} max={item.target_date ?? undefined} onChange={(event) => update(index, { start_date: event.target.value || null })} />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  <span><Trans>Target date <span className="font-normal text-muted-foreground">(optional)</span></Trans></span>
                  <Input type="date" value={item.target_date ?? ''} min={item.start_date ?? undefined} onChange={(event) => update(index, { target_date: event.target.value || null })} />
                </label>
              </div>
              {(progress[item.key]?.total ?? 0) > 0 ? (
                // linked tickets decide it: show what they give, not a manual choice that's ignored (TL-412)
                <p className="text-sm">
                  <Trans><span className="font-medium">Status:</span> {i18n._(STATUS_LABEL[itemStatus(item.manual_status, progress[item.key])])}{' '}
                  <span className="text-muted-foreground">(from its linked tickets)</span></Trans>
                </p>
              ) : (
              <label className="grid max-w-xs gap-1.5 text-sm font-medium">
                <Trans>Status <span className="font-normal text-muted-foreground">(set by hand until tickets are linked)</span></Trans>
                <Select
                  items={{ not_started: i18n._(STATUS_LABEL.not_started), in_progress: i18n._(STATUS_LABEL.in_progress), done: i18n._(STATUS_LABEL.done) }}
                  value={item.manual_status ?? 'not_started'}
                  onValueChange={(value) => value && update(index, { manual_status: String(value) as DraftItem['manual_status'] })}
                >
                  <SelectTrigger aria-label={t`Manual status for milestone ${n}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">{i18n._(STATUS_LABEL.not_started)}</SelectItem>
                    <SelectItem value="in_progress">{i18n._(STATUS_LABEL.in_progress)}</SelectItem>
                    <SelectItem value="done">{i18n._(STATUS_LABEL.done)}</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              )}
              {(() => {
                const s = saved.find((x) => x.id === item.key);
                return s ? (
                  <ItemTickets key={s.id} roadmapId={roadmapId} itemId={s.id} projectId={projectId} initial={s.tickets ?? []} progress={s.progress} token={token}
                    onProgress={(p) => setProgress((cur) => (cur[s.id]?.done === p.done && cur[s.id]?.total === p.total ? cur : { ...cur, [s.id]: p }))} />
                ) : (
                  <p className="text-sm text-muted-foreground"><Trans>Save items to link tickets to this milestone.</Trans></p>
                );
              })()}
            </li>
          ); })}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={saving} onClick={save}>{saving ? t`Saving…` : t`Save items`}</Button>
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </section>
  );
}

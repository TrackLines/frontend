'use client';

import { CheckIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { projectTickets, type TicketOption } from '@/components/ticket/dependencies';
import { TypeBadge } from '@/components/ticket-type';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { roadmaps, tickets, type EpicSummary, type TicketType } from '@/lib/api';

type Linked = { id: string; title: string; done: boolean; type?: TicketType };
type Progress = { done: number; total: number };

// progressLabel: "2 of 5 tickets done" (or a prompt when nothing is linked).
export function progressLabel(done: number, total: number): string {
  return total === 0 ? 'No tickets linked yet' : `${done} of ${total} ticket${total === 1 ? '' : 's'} done`;
}

// localProgress: progress from the links alone, until the server's figure arrives. A linked epic
// counts its sub-tickets (TL-216), which only the server knows, so it's left out here.
export const localProgress = (linked: Linked[]): Progress => {
  const tickets = linked.filter((t) => t.type !== 'epic');
  return { done: tickets.filter((t) => t.done).length, total: tickets.length };
};

// ItemTickets: the tickets (and epics) that deliver one roadmap milestone. Its progress is the
// server's: linked tickets done, with a linked epic counting its sub-tickets, so work added to the
// epic later counts too.
// onProgress: told each time the linked tickets' progress changes, so the editor shows the status they give (TL-412).
export function ItemTickets({ roadmapId, itemId, projectId, initial, progress: start, token, onProgress }: {
  roadmapId: string; itemId: string; projectId: string; initial: Linked[]; progress?: Progress; token: string; onProgress?: (p: Progress) => void;
}) {
  const [linked, setLinked] = useState<Linked[]>(initial);
  const [progress, setProgress] = useState<Progress>(start ?? localProgress(initial));
  useEffect(() => { onProgress?.(progress); }, [progress.done, progress.total]); // eslint-disable-line react-hooks/exhaustive-deps
  const [options, setOptions] = useState<TicketOption[] | null>(null);
  const [epics, setEpics] = useState<EpicSummary[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(next: Linked[]) {
    setSaving(true);
    setError('');
    try {
      await roadmaps.setItemTickets(roadmapId, itemId, next.map((t) => t.id), token);
      setLinked(next);
      setProgress(localProgress(next));
      // the server counts linked epics' sub-tickets: take its figure
      const item = (await roadmaps.get(roadmapId, token).catch(() => null))?.items?.find((i) => i.id === itemId);
      if (item?.progress) setProgress(item.progress);
    } catch {
      setError('Couldn’t update linked tickets. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function loadChoices() {
    try {
      const [ts, es] = await Promise.all([projectTickets(projectId, token), tickets.epics(projectId, token)]);
      setEpics(es);
      setOptions(ts.filter((o) => !es.some((e) => e.id === o.id))); // epics have their own picker
    } catch {
      setError('Couldn’t load the project’s tickets.');
    }
  }

  const choices = (options ?? []).filter((o) => !linked.some((l) => l.id === o.id));
  const epicChoices = (epics ?? []).filter((e) => !linked.some((l) => l.id === e.id));

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Linked tickets</span>
        <span className="text-muted-foreground">{linked.length === 0 ? progressLabel(0, 0) : progressLabel(progress.done, progress.total)}</span>
      </div>
      {progress.total > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label="Milestone progress">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
      )}
      {linked.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {linked.map((t) => (
            <li key={t.id} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
              {t.type === 'epic' && <TypeBadge type="epic" />}
              {t.done && <CheckIcon className="size-3 text-emerald-600" aria-label="done" />}
              <Link href={`/tickets/${t.id}`} className={`max-w-48 truncate hover:underline ${t.done ? 'text-muted-foreground line-through' : ''}`}>{t.title}</Link>
              <Button type="button" variant="ghost" size="icon-xs" disabled={saving} onClick={() => save(linked.filter((x) => x.id !== t.id))} className="size-4 rounded-full text-muted-foreground hover:text-destructive" aria-label={`Unlink ${t.title}`}>
                <XIcon className="size-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {options === null ? (
        <Button type="button" size="sm" variant="outline" className="justify-self-start" disabled={saving} onClick={() => void loadChoices()}>
          Link a ticket or epic…
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Select items={Object.fromEntries(choices.map((o) => [o.id, o.title]))} value={null} disabled={saving}
            onValueChange={(v) => { const o = choices.find((c) => c.id === v); if (o) void save([...linked, o]); }}>
            <SelectTrigger size="sm" className="w-full max-w-md" aria-label="Choose a ticket that delivers this milestone">
              <SelectValue placeholder={choices.length ? 'Link a ticket…' : 'No more tickets in this project'} />
            </SelectTrigger>
            <SelectContent>{choices.map((o) => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent>
          </Select>
          {epicChoices.length > 0 && (
            <Select items={Object.fromEntries(epicChoices.map((e) => [e.id, e.title]))} value={null} disabled={saving}
              onValueChange={(v) => { const e = epicChoices.find((c) => c.id === v); if (e) void save([...linked, { id: e.id, title: e.title, done: e.done, type: 'epic' }]); }}>
              <SelectTrigger size="sm" className="w-full max-w-md" aria-label="Choose an epic that delivers this milestone">
                <SelectValue placeholder="Link an epic…" />
              </SelectTrigger>
              <SelectContent>{epicChoices.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      )}
      {linked.some((t) => t.type === 'epic') && <p className="text-xs text-muted-foreground">A linked epic counts its sub-tickets, including ones added later.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

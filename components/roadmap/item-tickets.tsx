'use client';

import { CheckIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { projectTickets, type TicketOption } from '@/components/ticket/dependencies';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { roadmaps } from '@/lib/api';

type Linked = { id: string; title: string; done: boolean };

// progressLabel: "2 of 5 tickets done" (or a prompt when nothing is linked).
export function progressLabel(done: number, total: number): string {
  return total === 0 ? 'No tickets linked yet' : `${done} of ${total} ticket${total === 1 ? '' : 's'} done`;
}

// ItemTickets: the tickets that deliver one roadmap milestone; its progress is how many are done.
export function ItemTickets({ roadmapId, itemId, projectId, initial, token }: {
  roadmapId: string; itemId: string; projectId: string; initial: Linked[]; token: string;
}) {
  const [linked, setLinked] = useState<Linked[]>(initial);
  const [options, setOptions] = useState<TicketOption[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const done = linked.filter((t) => t.done).length;

  async function save(next: Linked[]) {
    setSaving(true);
    setError('');
    try {
      await roadmaps.setItemTickets(roadmapId, itemId, next.map((t) => t.id), token);
      setLinked(next);
    } catch {
      setError('Couldn’t update linked tickets. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const choices = (options ?? []).filter((o) => !linked.some((l) => l.id === o.id));

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Linked tickets</span>
        <span className="text-muted-foreground">{progressLabel(done, linked.length)}</span>
      </div>
      {linked.length > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={linked.length} aria-valuenow={done} aria-label="Milestone progress">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / linked.length) * 100}%` }} />
        </div>
      )}
      {linked.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {linked.map((t) => (
            <li key={t.id} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
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
        <Button type="button" size="sm" variant="outline" className="justify-self-start" disabled={saving}
          onClick={() => projectTickets(projectId, token).then(setOptions, () => setError('Couldn’t load the project’s tickets.'))}>
          Link a ticket…
        </Button>
      ) : (
        <Select items={Object.fromEntries(choices.map((o) => [o.id, o.title]))} value={null} disabled={saving}
          onValueChange={(v) => { const o = choices.find((c) => c.id === v); if (o) save([...linked, o]); }}>
          <SelectTrigger size="sm" className="w-full max-w-md" aria-label="Choose a ticket that delivers this milestone">
            <SelectValue placeholder={choices.length ? 'Choose a ticket…' : 'No more tickets in this project'} />
          </SelectTrigger>
          <SelectContent>{choices.map((o) => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

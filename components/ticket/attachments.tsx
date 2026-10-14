'use client';

import { ListSkeleton } from '@/components/page-skeletons';
import { PaperclipIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError, attachments, type Assignee, type Attachment } from '@/lib/api';
import { personLabel } from '@/lib/people';
import { usePeople } from '@/lib/use-people';
import { AttachFilesButton } from './attach-files-button';

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Attachments: list a ticket's files, upload more (browser → UploadThing), remove them.
// locked: the ticket is done — files can be viewed but not added/removed until it leaves Done.
export function Attachments({ ticketId, token, locked = false }: { ticketId: string; token: string; locked?: boolean }) {
  const [list, setList] = useState<Attachment[] | null>(null);
  const [error, setError] = useState('');
  const people = usePeople(token);

  useEffect(() => {
    attachments.list(ticketId, token).then(setList, () => setError('Couldn’t load attachments.'));
  }, [ticketId]); // token refreshes must not refetch

  async function keep(a: Attachment) {
    setError('');
    try {
      await attachments.keep(a.id, token);
      setList((l) => l && l.map((x) => (x.id === a.id ? { ...x, delete_on: null } : x)));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'Only an organization admin or whoever uploaded it can keep this file.' : `Couldn’t keep “${a.name}”. Please try again.`);
    }
  }

  async function remove(a: Attachment) {
    if (!confirm(`Remove “${a.name}”? The file is deleted too.`)) return;
    try {
      await attachments.remove(a.id, token);
      setList((l) => l && l.filter((x) => x.id !== a.id));
    } catch {
      setError(`Couldn’t remove “${a.name}”.`);
    }
  }

  return (
    <section aria-labelledby={`attachments-${ticketId}`} className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`attachments-${ticketId}`} className="flex items-center gap-1.5 text-sm font-semibold">
          <PaperclipIcon className="size-4" aria-hidden /> Attachments{list ? ` (${list.length})` : ''}
        </h2>
        {!locked && (
          <AttachFilesButton
            target={{ ticketId }}
            existing={list?.length ?? 0}
            onUploaded={async (files) => {
              setError('');
              for (const f of files) {
                try {
                  const a = await attachments.add(ticketId, f, token);
                  setList((l) => [...(l ?? []), a]);
                } catch {
                  setError(`Uploaded “${f.name}” but couldn’t attach it to the ticket. Please try again.`);
                }
              }
            }}
            onError={setError}
          />
        )}
      </div>
      {locked && <p className="text-sm text-muted-foreground">This ticket is done — move it out of Done to add or remove files.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {list === null ? (
        !error && <ListSkeleton rows={1} />
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files attached.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {list.map((a) => <AttachmentRow key={a.id} a={a} people={people} locked={locked} onRemove={() => remove(a)} onKeep={() => keep(a)} />)}
        </ul>
      )}
    </section>
  );
}

const dueDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

// AttachmentRow: one file; a year-old one says when it goes and can be kept another year (TL-259).
// Keep shows even when the ticket is done: keeping changes nothing on the ticket (pure, for tests).
export function AttachmentRow({ a, people = null, locked, onRemove, onKeep }: { a: Attachment; people?: Assignee[] | null; locked: boolean; onRemove: () => void; onKeep: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
      <a href={a.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium hover:underline">{a.name}</a>
      <span className="text-muted-foreground">{formatSize(a.size)} · {personLabel(a.created_by, people)}</span>
      {a.delete_on && (
        <span className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          Deleted on {dueDay.format(new Date(`${a.delete_on}T00:00:00Z`))} unless kept
          <Button size="sm" variant="outline" onClick={onKeep} title="Keep it for another year">Keep</Button>
        </span>
      )}
      {!locked && <Button size="sm" variant="ghost" className="text-destructive" onClick={onRemove}>Remove</Button>}
    </li>
  );
}

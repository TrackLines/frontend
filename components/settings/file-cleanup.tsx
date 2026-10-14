import Link from 'next/link';
import { formatSize } from '@/components/ticket/attachments';
import { Button } from '@/components/ui/button';
import type { Assignee, FileCleanup } from '@/lib/api';
import { personLabel } from '@/lib/people';

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

// hasCleanup: is there anything to show? Settings only links the page when there is (TL-261).
export const hasCleanup = (r: FileCleanup | null) => !!r && (r.due.length > 0 || r.deleted.length > 0);

// FileCleanupLink: the Settings section, only when files are due to go or have gone.
export function FileCleanupLink({ report }: { report: FileCleanup | null }) {
  if (!hasCleanup(report)) return null;
  const due = report!.due.length;
  return (
    <section className="mt-6 rounded-xl border p-5">
      <h2 className="text-lg font-semibold">File clean-up</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {due ? `${due} year-old ${due === 1 ? 'file is' : 'files are'} due to be deleted unless someone keeps ${due === 1 ? 'it' : 'them'}.` : 'Year-old files the clean-up has deleted.'}
      </p>
      <Link href="/settings/file-cleanup" className="mt-3 inline-block text-sm font-medium hover:underline">See files →</Link>
    </section>
  );
}

// FileCleanupView: what's due to be deleted (with Keep) and what has been (pure, for tests).
export function FileCleanupView({ report, people, onKeep }: { report: FileCleanup; people: Assignee[] | null; onKeep: (id: string) => void }) {
  const ticket = (f: { ticket_id: string; ticket_key: string; ticket_title: string }) =>
    <Link href={`/tickets/${f.ticket_id}`} className="min-w-0 truncate text-muted-foreground hover:underline">{f.ticket_key}: {f.ticket_title}</Link>;
  return (
    <>
      <section aria-labelledby="cleanup-due" className="grid gap-3">
        <h2 id="cleanup-due" className="text-lg font-semibold">Due for deletion</h2>
        {report.due.length === 0 ? <p className="text-sm text-muted-foreground">Nothing is due to be deleted.</p> : (
          <ul className="divide-y rounded-lg border">
            {report.due.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <span className="grid min-w-0 flex-1">
                  <span className="truncate font-medium">{f.name}</span>
                  {ticket(f)}
                </span>
                <span className="text-muted-foreground">{formatSize(f.size)} · {personLabel(f.created_by, people)}</span>
                <span className="text-amber-700 dark:text-amber-400">Deleted on {day.format(new Date(f.delete_on))}</span>
                <Button size="sm" variant="outline" onClick={() => onKeep(f.id)} title="Keep it for another year">Keep</Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="cleanup-deleted" className="mt-8 grid gap-3">
        <h2 id="cleanup-deleted" className="text-lg font-semibold">Deleted</h2>
        {report.deleted.length === 0 ? <p className="text-sm text-muted-foreground">No files have been deleted yet.</p> : (
          <ul className="divide-y rounded-lg border">
            {report.deleted.map((f, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <span className="grid min-w-0 flex-1">
                  <span className="truncate font-medium">{f.name}</span>
                  {ticket(f)}
                </span>
                <span className="text-muted-foreground">{formatSize(f.size)} · {personLabel(f.created_by, people)}</span>
                <span className="text-muted-foreground">Deleted {day.format(new Date(f.deleted_at))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

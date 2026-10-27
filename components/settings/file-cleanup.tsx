import { plural } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { TrashIcon } from 'lucide-react';
import Link from 'next/link';
import { formatSize } from '@/components/ticket/attachments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SettingsCard } from './settings-card';
import type { Assignee, FileCleanup } from '@/lib/api';
import { personLabel } from '@/lib/work/people';
import { dates } from '@/lib/i18n';

// hasCleanup: is there anything to show? Settings only links the page when there is (TL-261).
export const hasCleanup = (r: FileCleanup | null) => !!r && (r.due.length > 0 || r.deleted.length > 0);

// FileCleanupLink: the Settings card, only when files are due to go or have gone.
export function FileCleanupLink({ report }: { report: FileCleanup | null }) {
  const { t } = useLingui();
  if (!hasCleanup(report)) return null;
  const due = report!.due.length;
  return (
    <SettingsCard icon={TrashIcon} title={t`File clean-up`} href="/settings/file-cleanup"
      badge={due > 0 && <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"><Trans>{due} due</Trans></Badge>}
      description={due ? t`${plural(due, { one: '# year-old file is due to be deleted unless someone keeps it.', other: '# year-old files are due to be deleted unless someone keeps them.' })}` : t`Year-old files the clean-up has deleted.`} />
  );
}

// FileCleanupView: what's due to be deleted (with Keep) and what has been (pure, for tests).
export function FileCleanupView({ report, people, onKeep }: { report: FileCleanup; people: Assignee[] | null; onKeep: (id: string) => void }) {
  const { t, i18n } = useLingui();
  const day = dates(i18n, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const ticket = (f: { ticket_id: string; ticket_key: string; ticket_title: string }) =>
    <Link href={`/tickets/${f.ticket_id}`} className="min-w-0 truncate text-muted-foreground hover:underline">{f.ticket_key}: {f.ticket_title}</Link>;
  return (
    <>
      <section aria-labelledby="cleanup-due" className="grid gap-3">
        <h2 id="cleanup-due" className="text-lg font-semibold"><Trans>Due for deletion</Trans></h2>
        {report.due.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>Nothing is due to be deleted.</Trans></p> : (
          <ul className="divide-y rounded-lg border">
            {report.due.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <span className="grid min-w-0 flex-1">
                  <span className="truncate font-medium">{f.name}</span>
                  {ticket(f)}
                </span>
                <span className="text-muted-foreground">{formatSize(f.size)} · {personLabel(i18n, f.created_by, people)}</span>
                <span className="text-amber-700 dark:text-amber-400"><Trans>Deleted on {day.format(new Date(f.delete_on))}</Trans></span>
                <Button size="sm" variant="outline" onClick={() => onKeep(f.id)} title={t`Keep it for another year`}><Trans>Keep</Trans></Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="cleanup-deleted" className="mt-8 grid gap-3">
        <h2 id="cleanup-deleted" className="text-lg font-semibold"><Trans>Deleted</Trans></h2>
        {report.deleted.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>No files have been deleted yet.</Trans></p> : (
          <ul className="divide-y rounded-lg border">
            {report.deleted.map((f, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <span className="grid min-w-0 flex-1">
                  <span className="truncate font-medium">{f.name}</span>
                  {ticket(f)}
                </span>
                <span className="text-muted-foreground">{formatSize(f.size)} · {personLabel(i18n, f.created_by, people)}</span>
                <span className="text-muted-foreground"><Trans>Deleted {day.format(new Date(f.deleted_at))}</Trans></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

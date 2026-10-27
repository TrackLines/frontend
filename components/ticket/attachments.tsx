'use client';

import { ListSkeleton } from '@/components/layout/page-skeletons';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { DownloadIcon, EyeIcon, PaperclipIcon, XIcon } from 'lucide-react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { ApiError, attachments, type Assignee, type Attachment } from '@/lib/api';
import { personLabel } from '@/lib/work/people';
import { usePeople } from '@/lib/hooks/use-people';
import { dates } from '@/lib/i18n';
import { AttachFilesButton } from './attach-files-button';

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Attachments: list a ticket's files, upload more (browser → UploadThing), remove them.
// locked: the ticket is done — files can be viewed but not added/removed until it leaves Done.
export function Attachments({ ticketId, token, locked = false }: { ticketId: string; token: string; locked?: boolean }) {
  const { t } = useLingui();
  const [list, setList] = useState<Attachment[] | null>(null);
  const [error, setError] = useState('');
  const people = usePeople(token);

  useEffect(() => {
    attachments.list(ticketId, token).then(setList, () => setError(t`Couldn’t load attachments.`));
  }, [ticketId]); // token refreshes must not refetch

  async function keep(a: Attachment) {
    setError('');
    try {
      await attachments.keep(a.id, token);
      setList((l) => l && l.map((x) => (x.id === a.id ? { ...x, delete_on: null } : x)));
    } catch (err) {
      const name = a.name;
      setError(err instanceof ApiError && err.status === 403 ? t`Only an organization admin or whoever uploaded it can keep this file.` : t`Couldn’t keep “${name}”. Please try again.`);
    }
  }

  async function remove(a: Attachment) {
    const name = a.name;
    if (!confirm(t`Remove “${name}”? The file is deleted too.`)) return;
    try {
      await attachments.remove(a.id, token);
      setList((l) => l && l.filter((x) => x.id !== a.id));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? t`Only an organization admin or whoever uploaded it can remove this file.` : t`Couldn’t remove “${name}”.`);
    }
  }

  return (
    <section aria-labelledby={`attachments-${ticketId}`} className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`attachments-${ticketId}`} className="flex items-center gap-1.5 text-sm font-semibold">
          <PaperclipIcon className="size-4" aria-hidden /> {list ? <Trans>Attachments ({list.length})</Trans> : <Trans>Attachments</Trans>}
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
                  const name = f.name;
                  setError(t`Uploaded “${name}” but couldn’t attach it to the ticket. Please try again.`);
                }
              }
            }}
            onError={setError}
          />
        )}
      </div>
      {locked && <p className="text-sm text-muted-foreground"><Trans>This ticket is done — move it out of Done to add or remove files.</Trans></p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {list === null ? (
        !error && <ListSkeleton rows={1} />
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground"><Trans>No files attached.</Trans></p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {list.map((a) => <AttachmentRow key={a.id} a={a} people={people} locked={locked} onRemove={() => remove(a)} onKeep={() => keep(a)} />)}
        </ul>
      )}
    </section>
  );
}

// previewKind: what a file shows inline so people needn't download it, or null to leave it a plain
// link. Sensible types only (TL-489): images, PDFs and media; documents, archives (zip) etc. stay links.
export function previewKind(contentType: string): 'image' | 'pdf' | 'video' | 'audio' | null {
  const t = contentType.toLowerCase();
  if (t.startsWith('image/')) return 'image';
  if (t === 'application/pdf') return 'pdf';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  return null;
}

// downloadAttachment saves a file under its own name. The files live on UploadThing (another
// origin), where <a download> is ignored, so it fetches the bytes and saves a blob; if that fails
// (CORS, offline) it opens the file in a new tab instead, so the click always does something (TL-516).
export async function downloadAttachment(
  a: Pick<Attachment, 'url' | 'name'>,
  get: typeof fetch = fetch,
  open: (url: string) => void = (url) => void window.open(url, '_blank', 'noopener'),
): Promise<'saved' | 'opened'> {
  try {
    const res = await get(a.url);
    if (!res.ok) throw new Error(String(res.status));
    const url = URL.createObjectURL(await res.blob());
    Object.assign(document.createElement('a'), { href: url, download: a.name }).click();
    URL.revokeObjectURL(url);
    return 'saved';
  } catch {
    open(a.url);
    return 'opened';
  }
}

// popupWidth: the preview sizes to the file, between 30% and 80% of the screen (full width less the
// gutter on phones): images and video at their natural width, PDFs (no size of their own) wide, audio narrow.
const popupWidth: Record<NonNullable<ReturnType<typeof previewKind>>, string> = {
  image: 'w-fit sm:min-w-[30vw] sm:max-w-[80vw]',
  video: 'w-fit sm:min-w-[30vw] sm:max-w-[80vw]',
  pdf: 'w-full sm:w-[80vw]',
  audio: 'w-full sm:w-[30vw]',
};

// PreviewBody is the file itself, at full height: a long screenshot isn't squashed, the page scrolls.
export function PreviewBody({ a, kind }: { a: Attachment; kind: NonNullable<ReturnType<typeof previewKind>> }) {
  if (kind === 'image') return <img src={a.url} alt={a.name} className="h-auto max-w-full rounded-md border" />;
  if (kind === 'pdf') return <iframe src={a.url} title={a.name} className="h-[85vh] w-full rounded-md border" />;
  if (kind === 'video') return <video src={a.url} controls preload="metadata" className="h-auto max-w-full rounded-md border" />;
  return <audio src={a.url} controls preload="metadata" className="w-full" />;
}

// PreviewDialog: the file in a modal (TL-516), so the list stays a list. It scrolls with the page
// (Base UI's Viewport) instead of fitting the screen, so a tall file can be read to the bottom.
function PreviewDialog({ a, kind, open, onOpenChange }: { a: Attachment; kind: NonNullable<ReturnType<typeof previewKind>>; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useLingui();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex justify-center overflow-y-auto px-4 py-8">
          <DialogPrimitive.Popup className={`grid h-fit max-w-full gap-3 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none ${popupWidth[kind]}`}>
            <div className="flex items-center gap-2">
              <DialogTitle className="min-w-0 flex-1 truncate">{a.name}</DialogTitle>
              <Button size="sm" variant="outline" onClick={() => void downloadAttachment(a)}><DownloadIcon aria-hidden /><Trans>Download</Trans></Button>
              <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label={t`Close`} />}><XIcon aria-hidden /></DialogClose>
            </div>
            <PreviewBody a={a} kind={kind} />
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPortal>
    </Dialog>
  );
}

// AttachmentRow: one file; a year-old one says when it goes and can be kept another year (TL-259).
// Keep shows even when the ticket is done: keeping changes nothing on the ticket (pure, for tests).
// Images, PDFs and media open in a preview modal (TL-516); everything else gets a download button.
export function AttachmentRow({ a, people = null, locked, onRemove, onKeep }: { a: Attachment; people?: Assignee[] | null; locked: boolean; onRemove: () => void; onKeep: () => void }) {
  const { t, i18n } = useLingui();
  const kind = previewKind(a.content_type);
  const [previewing, setPreviewing] = useState(false);
  const name = a.name;
  const due = a.delete_on && dates(i18n, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${a.delete_on}T00:00:00Z`));
  return (
    <li className="px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <a href={a.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium hover:underline">{a.name}</a>
        <span className="text-muted-foreground">{formatSize(a.size)} · {personLabel(i18n, a.created_by, people)}</span>
        {a.delete_on && (
          <span className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Trans>Deleted on {due} unless kept</Trans>
            <Button size="sm" variant="outline" onClick={onKeep} title={t`Keep it for another year`}><Trans>Keep</Trans></Button>
          </span>
        )}
        {kind ? (
          <Button size="icon-sm" variant="ghost" aria-label={t`Preview ${name}`} title={t`Preview`} onClick={() => setPreviewing(true)}><EyeIcon aria-hidden /></Button>
        ) : (
          <Button size="icon-sm" variant="ghost" aria-label={t`Download ${name}`} title={t`Download`} onClick={() => void downloadAttachment(a)}><DownloadIcon aria-hidden /></Button>
        )}
        {!locked && <Button size="sm" variant="ghost" className="text-destructive" onClick={onRemove}><Trans>Remove</Trans></Button>}
      </div>
      {kind && <PreviewDialog a={a} kind={kind} open={previewing} onOpenChange={setPreviewing} />}
    </li>
  );
}

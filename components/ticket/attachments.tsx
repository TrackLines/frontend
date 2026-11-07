'use client';

import { ListSkeleton } from '@/components/layout/page-skeletons';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { DownloadIcon, FileArchiveIcon, FileAudioIcon, FileIcon, FileImageIcon, FileTextIcon, FileVideoIcon, PaperclipIcon, Trash2Icon, XIcon, type LucideIcon } from 'lucide-react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useContext, useEffect, useState } from 'react';
import { Attachment as AttachmentCard, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from '@/components/ui/attachment';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { ApiError, attachments, type Assignee, type Attachment } from '@/lib/api';
import { personLabel } from '@/lib/work/people';
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh';
import { usePeople } from '@/lib/hooks/use-people';
import { FOLLOW_REFRESH_MS, HostPreview } from '@/lib/live/hosted';
import { dates } from '@/lib/i18n';
import { AttachFilesButton } from './attach-files-button';

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Attachments: list a ticket's files, upload more (browser → UploadThing), remove them.
// locked: the ticket is done — files can be viewed but not added/removed until it leaves Done.
// following: a live session's follower: files only to look at, kept current, and the host's preview (shown) opens by itself.
export function Attachments({ ticketId, token, locked = false, following }: { ticketId: string; token: string; locked?: boolean; following?: { shown: string | null } }) {
  const { t } = useLingui();
  const [list, setList] = useState<Attachment[] | null>(null);
  const [error, setError] = useState('');
  const people = usePeople(token);

  useEffect(() => {
    attachments.list(ticketId, token).then(setList, () => setError(t`Couldn’t load attachments.`));
  }, [ticketId, following?.shown]); // token refreshes must not refetch; a file the host just added may be what they opened
  useAutoRefresh(() => attachments.list(ticketId, token).then(setList, () => {}), !!following, FOLLOW_REFRESH_MS);

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
        {!locked && !following && (
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
      {locked && !following && <p className="text-sm text-muted-foreground"><Trans>This ticket is done — move it out of Done to add or remove files.</Trans></p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {list === null ? (
        !error && <ListSkeleton rows={1} />
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground"><Trans>No files attached.</Trans></p>
      ) : (
        <ul className="grid gap-2">
          {list.map((a) => <AttachmentRow key={a.id} a={a} people={people} locked={locked} following={following && { shown: following.shown === a.id }} onRemove={() => remove(a)} onKeep={() => keep(a)} />)}
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

// fileIcon: the file's type at a glance (TL-844); no thumbnails, so the list stays light (TL-516).
export function fileIcon(contentType: string, name = ''): LucideIcon {
  const t = contentType.toLowerCase();
  if (t.startsWith('image/')) return FileImageIcon;
  if (t.startsWith('video/')) return FileVideoIcon;
  if (t.startsWith('audio/')) return FileAudioIcon;
  if (t === 'application/pdf' || t.startsWith('text/')) return FileTextIcon;
  if (/zip|tar|gzip|compressed|archive/.test(t) || /\.(zip|tar|gz|tgz|7z|rar)$/i.test(name)) return FileArchiveIcon;
  return FileIcon;
}

// AttachmentRow: one file, as shadcn's Attachment card (TL-844); a year-old one says when it goes and can
// be kept another year (TL-259). Keep shows even when the ticket is done: keeping changes nothing on the
// ticket (pure, for tests). Images, PDFs and media open in a preview modal on a click (TL-516); anything
// else opens in a new tab, with a download button.
export function AttachmentRow({ a, people = null, locked, following, onRemove, onKeep }: { a: Attachment; people?: Assignee[] | null; locked: boolean; following?: { shown: boolean }; onRemove: () => void; onKeep: () => void }) {
  const { t, i18n } = useLingui();
  const kind = previewKind(a.content_type);
  const [previewing, setPreviewing] = useState(following?.shown ?? false);
  const hostPreview = useContext(HostPreview);
  // a follower's follows the host, and they can still close their own
  useEffect(() => { if (following) setPreviewing(following.shown); }, [following?.shown]);
  const preview = (open: boolean) => { setPreviewing(open); hostPreview?.(open ? a.id : null); };
  const name = a.name;
  const due = a.delete_on && dates(i18n, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${a.delete_on}T00:00:00Z`));
  const Icon = fileIcon(a.content_type, a.name);
  return (
    <li>
      <AttachmentCard className="w-full">
        <AttachmentMedia><Icon aria-hidden /></AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{a.name}</AttachmentTitle>
          <AttachmentDescription>{formatSize(a.size)} · {personLabel(i18n, a.created_by, people)}</AttachmentDescription>
          {a.delete_on && <span className="mt-1 block text-xs text-amber-700 dark:text-amber-400"><Trans>Deleted on {due} unless kept</Trans></span>}
        </AttachmentContent>
        {kind
          ? <AttachmentTrigger aria-label={t`Preview ${name}`} title={t`Preview`} onClick={() => preview(true)} />
          : <AttachmentTrigger render={<a href={a.url} target="_blank" rel="noopener noreferrer" />} aria-label={t`Open ${name}`} />}
        <AttachmentActions className="gap-1">
          {a.delete_on && !following && <Button size="sm" variant="outline" onClick={onKeep} title={t`Keep it for another year`}><Trans>Keep</Trans></Button>}
          {!kind && <AttachmentAction aria-label={t`Download ${name}`} title={t`Download`} onClick={() => void downloadAttachment(a)}><DownloadIcon aria-hidden /></AttachmentAction>}
          {!locked && !following && <AttachmentAction aria-label={t`Remove ${name}`} title={t`Remove`} className="text-muted-foreground hover:text-destructive" onClick={onRemove}><Trash2Icon aria-hidden /></AttachmentAction>}
        </AttachmentActions>
      </AttachmentCard>
      {kind && <PreviewDialog a={a} kind={kind} open={previewing} onOpenChange={preview} />}
    </li>
  );
}

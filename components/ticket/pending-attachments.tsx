'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { XIcon } from 'lucide-react';
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from '@/components/ui/attachment';
import { attachments } from '@/lib/api';
import { AttachFilesButton } from './attach-files-button';
import { fileIcon, formatSize } from './attachments';

// A file already uploaded to UploadThing, waiting for its ticket to exist.
export type PendingFile = { key: string; url: string; name: string; size: number; content_type: string };

// PendingAttachments lets a "create ticket" dialog take files before the ticket exists;
// call attachAll once it's created.
// ponytail: files uploaded then abandoned (dialog cancelled) stay on UploadThing unattached;
// add a cleanup sweep if that ever matters.
// projectId: the project the new ticket goes in (uploads are checked against it); '' until chosen.
export function PendingAttachments({ files, onChange, projectId }: { files: PendingFile[]; onChange: (f: PendingFile[]) => void; projectId: string }) {
  const { t } = useLingui();
  return (
    <div className="grid gap-2">
      {/* the button sits by its label, like "Add labels" above it */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium"><Trans>Attachments <span className="font-normal text-muted-foreground">(optional)</span></Trans></span>
        <AttachFilesButton target={projectId ? { projectId } : null} existing={files.length} onUploaded={(up) => onChange([...files, ...up])} />
      </div>
      {files.length > 0 && (
        <ul className="grid gap-2">
          {files.map((f) => {
            const Icon = fileIcon(f.content_type, f.name);
            return (
              <li key={f.key}>
                <Attachment size="sm" className="w-full">
                  <AttachmentMedia><Icon aria-hidden /></AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{f.name}</AttachmentTitle>
                    <AttachmentDescription>{formatSize(f.size)}</AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction type="button" className="text-muted-foreground hover:text-destructive" aria-label={t`Don't attach ${f.name}`} onClick={() => onChange(files.filter((x) => x.key !== f.key))}><XIcon aria-hidden /></AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// attachAll records uploaded files on a ticket; returns how many failed.
export async function attachAll(ticketId: string, files: PendingFile[], token: string): Promise<number> {
  const results = await Promise.allSettled(files.map((f) => attachments.add(ticketId, f, token)));
  return results.filter((r) => r.status === 'rejected').length;
}

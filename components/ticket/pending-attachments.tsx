'use client';

import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { attachments } from '@/lib/api';
import { UploadButton } from '@/lib/uploadthing';
import { formatSize } from './attachments';

// A file already uploaded to UploadThing, waiting for its ticket to exist.
export type PendingFile = { key: string; url: string; name: string; size: number; content_type: string };

// PendingAttachments lets a "create ticket" dialog take files before the ticket exists;
// call attachAll once it's created.
// ponytail: files uploaded then abandoned (dialog cancelled) stay on UploadThing unattached;
// add a cleanup sweep if that ever matters.
export function PendingAttachments({ files, onChange }: { files: PendingFile[]; onChange: (f: PendingFile[]) => void }) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Attachments <span className="font-normal text-muted-foreground">(optional)</span></span>
        <UploadButton
          endpoint="ticketAttachment"
          appearance={{ button: 'bg-secondary text-secondary-foreground text-sm h-8 px-3 rounded-md', allowedContent: 'hidden' }}
          content={{ button: ({ isUploading }) => (isUploading ? 'Uploading…' : 'Attach files') }}
          onClientUploadComplete={(up) =>
            onChange([...files, ...up.map((f) => ({ key: f.key, url: f.ufsUrl, name: f.name, size: f.size, content_type: f.type }))])
          }
        />
      </div>
      {files.length > 0 && (
        <ul className="grid gap-1 text-sm">
          {files.map((f) => (
            <li key={f.key} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-muted-foreground">{formatSize(f.size)}</span>
              <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-destructive" aria-label={`Don't attach ${f.name}`} onClick={() => onChange(files.filter((x) => x.key !== f.key))}><XIcon /></Button>
            </li>
          ))}
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

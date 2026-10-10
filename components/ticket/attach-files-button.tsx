'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useUploadThing } from '@/lib/uploadthing';
import type { PendingFile } from './pending-attachments';

type Props = {
  onUploaded: (files: PendingFile[]) => void | Promise<void>;
  onError?: (message: string) => void;
  variant?: 'default' | 'secondary' | 'outline';
};

// AttachFilesButton: our Button over a hidden file input; picked files upload straight to
// UploadThing (browser → UploadThing), then onUploaded gets them to record on a ticket.
export function AttachFilesButton({ onUploaded, onError, variant = 'outline' }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const { startUpload, isUploading } = useUploadThing('ticketAttachment', {
    onUploadError: (e) => onError?.(e.message || 'Upload failed. Please try again.'),
  });

  async function upload(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (input.current) input.current.value = ''; // the same file can be picked again
    if (files.length === 0) return;
    const done = await startUpload(files);
    if (done) await onUploaded(done.map((f) => ({ key: f.key, url: f.ufsUrl, name: f.name, size: f.size, content_type: f.type })));
  }

  return (
    <>
      <input ref={input} type="file" multiple hidden onChange={(e) => void upload(e.target.files)} />
      <Button type="button" size="sm" variant={variant} disabled={isUploading} onClick={() => input.current?.click()}>
        {isUploading ? 'Uploading…' : 'Attach files'}
      </Button>
    </>
  );
}

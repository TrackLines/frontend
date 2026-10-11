'use client';

import { useRef, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUploadThing } from '@/lib/uploadthing';
import type { PendingFile } from './pending-attachments';

type Props = {
  onUploaded: (files: PendingFile[]) => void | Promise<void>;
  onError?: (message: string) => void;
  variant?: 'default' | 'secondary' | 'outline';
};

// AttachFilesButton: a label styled as our button, wrapping a visually hidden file input; picked
// files upload straight to UploadThing (browser → UploadThing), then onUploaded records them.
// The label opens the picker natively: iPad Safari won't reliably open a display:none input from a
// script click. Errors show here unless the caller handles them (onError).
export function AttachFilesButton({ onUploaded, onError, variant = 'outline' }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const fail = (message: string) => (onError ? onError(message) : setError(message));
  const { startUpload, isUploading } = useUploadThing('ticketAttachment', {
    onUploadError: (e) => fail(e.message || 'Upload failed. Please try again.'),
  });

  async function upload(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (input.current) input.current.value = ''; // the same file can be picked again
    if (files.length === 0) return;
    setError('');
    const done = await startUpload(files).catch(() => {
      fail('Upload failed. Please try again.');
      return undefined;
    });
    if (done) await onUploaded(done.map((f) => ({ key: f.key, url: f.ufsUrl, name: f.name, size: f.size, content_type: f.type })));
  }

  return (
    <span className="inline-grid gap-1">
      <label className={cn(buttonVariants({ variant, size: 'sm' }), 'cursor-pointer has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
        isUploading && 'pointer-events-none opacity-50')}>
        <input ref={input} type="file" multiple className="sr-only" disabled={isUploading} onChange={(e) => void upload(e.target.files)} />
        {isUploading ? 'Uploading…' : 'Attach files'}
      </label>
      {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
    </span>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

// CopyLink copies an absolute URL for an app path (e.g. /tickets/<id>) to the clipboard.
export function CopyLink({ path, className }: { path: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      className={className}
      onClick={() => navigator.clipboard.writeText(window.location.origin + path).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
    >
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  );
}

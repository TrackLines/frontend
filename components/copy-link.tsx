'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

// CopyButton copies value to the clipboard and says "Copied" for 2s.
export function CopyButton({ value, label, className, size, ariaLabel }: {
  value: string; label: string; className?: string; size?: 'sm' | 'default'; ariaLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={className}
      aria-label={ariaLabel}
      onClick={() => navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
    >
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </Button>
  );
}

// CopyLink copies an absolute URL for an app path (e.g. /tickets/<id>) to the clipboard.
export function CopyLink({ path, className }: { path: string; className?: string }) {
  return <CopyButton value={typeof window === 'undefined' ? path : window.location.origin + path} label="Copy link" className={className} />;
}

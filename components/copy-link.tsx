'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { shortLinks } from '@/lib/api';

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

const made = new Map<string, string>(); // short links already made this session

// shortOr: the short link for full, or full itself if one can't be made (signed out, shortener down).
export async function shortOr(full: string, make: ((url: string) => Promise<{ url: string }>) | null): Promise<string> {
  if (made.has(full)) return made.get(full)!;
  if (!make) return full;
  try {
    const { url } = await make(full);
    made.set(full, url);
    return url;
  } catch {
    return full;
  }
}

// CopyLink copies a short link for an app path (e.g. /tickets/<id>) to the clipboard (TL-277), or the
// full link when it can't be shortened. The copy starts on the click and takes the link once it's
// ready, which Safari needs (it only lets a click copy, not something after it).
// token: the signed-in caller's (no token: the full link). title: what the short link is called, which
// anyone can look up, so a key or "a board", never a ticket's own title.
export function CopyLink({ path, token, title = 'TrackLin.es', className }: { path: string; token?: string | null; title?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const link = shortOr(window.location.origin + path, token ? (url) => shortLinks.create(url, title, token) : null);
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': link.then((t) => new Blob([t], { type: 'text/plain' })) })]);
    } catch {
      await navigator.clipboard.writeText(await link); // no ClipboardItem: copy it once it's here
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button type="button" variant="ghost" className={className} onClick={() => void copy()}>
      <span aria-live="polite">{copied ? 'Copied' : 'Copy link'}</span>
    </Button>
  );
}

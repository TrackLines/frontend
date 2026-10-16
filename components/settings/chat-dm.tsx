'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MessageSquareIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { SettingsCard } from '@/components/settings/settings-card';
import { ApiError, chatApp, type ChatLink } from '@/lib/api';

// ChatDmCard: your own notifications in Google Chat (TL-289), from the Tracklines Chat app. Shown only
// when the server has the app. Linking starts in Chat (the app sends a one-time link); here you see
// whether you're linked, and unlink.
export function ChatDmCard({ token }: { token: string }) {
  const [link, setLink] = useState<ChatLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { chatApp.status(token).then(setLink, () => {}); }, []); // token refreshes must not refetch
  async function unlink() {
    if (!confirm('Stop getting your notifications in Google Chat?')) return;
    setBusy(true);
    setError('');
    try {
      await chatApp.unlink(token);
      setLink(await chatApp.status(token));
    } catch {
      setError('Couldn’t unlink. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return <ChatDmView link={link} busy={busy} error={error} onUnlink={() => void unlink()} />;
}

// ChatDmView: pure, for tests.
export function ChatDmView({ link, busy, error, onUnlink }: { link: ChatLink | null; busy: boolean; error: string; onUnlink: () => void }) {
  if (!link?.available) return null;
  return (
    <SettingsCard icon={MessageSquareIcon} title="Google Chat"
      badge={link.linked ? <Badge>Linked</Badge> : <Badge variant="outline">Not linked</Badge>}
      description={link.linked
        ? 'The Tracklines app messages you in Google Chat when you’re assigned a ticket, mentioned, or something needs your review.'
        : 'Get your notifications in Google Chat: find “Tracklines” in Google Chat, send it a message, and open the link it sends you.'}>
      {link.linked && <Button variant="outline" size="sm" disabled={busy} onClick={onUnlink}>{busy ? 'Unlinking…' : 'Unlink'}</Button>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </SettingsCard>
  );
}

// The /chat/link page (TL-289): linking, linked, or why not.
export type LinkResult = 'linking' | 'linked' | { error: string };

// linkError: what went wrong, in words someone can act on.
export function linkError(err: unknown): string {
  if (err instanceof ApiError && err.status === 400) return 'This link has expired or was already used. Send the Tracklines app a message in Google Chat for a new one.';
  if (err instanceof ApiError && err.status === 503) return 'Google Chat isn’t set up on this server.';
  return 'Couldn’t link Google Chat. Please try again.';
}

// ChatLinkView: pure, for tests.
export function ChatLinkView({ result }: { result: LinkResult }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Google Chat</h1>
      {result === 'linking' && <p role="status" className="mt-4 text-muted-foreground">Linking your Google Chat…</p>}
      {result === 'linked' && (
        <>
          <p role="status" className="mt-4">You’re linked. The Tracklines app will message you in Google Chat when you’re assigned a ticket, mentioned, or something needs your review.</p>
          <p className="mt-2 text-sm text-muted-foreground">You can unlink it any time in Settings.</p>
        </>
      )}
      {typeof result === 'object' && <p role="alert" className="mt-4 text-destructive">{result.error}</p>}
      <Link href="/settings" className={buttonVariants({ variant: 'outline', className: 'mt-6' })}>Go to Settings</Link>
    </main>
  );
}

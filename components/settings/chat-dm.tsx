'use client';

import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
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
  const { t } = useLingui();
  const [link, setLink] = useState<ChatLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { chatApp.status(token).then(setLink, () => {}); }, []); // token refreshes must not refetch
  async function unlink() {
    if (!confirm(t`Stop getting your notifications in Google Chat?`)) return;
    setBusy(true);
    setError('');
    try {
      await chatApp.unlink(token);
      setLink(await chatApp.status(token));
    } catch {
      setError(t`Couldn’t unlink. Please try again.`);
    } finally {
      setBusy(false);
    }
  }
  return <ChatDmView link={link} busy={busy} error={error} onUnlink={() => void unlink()} />;
}

// ChatDmView: pure, for tests.
export function ChatDmView({ link, busy, error, onUnlink }: { link: ChatLink | null; busy: boolean; error: string; onUnlink: () => void }) {
  const { t } = useLingui();
  if (!link?.available) return null;
  return (
    <SettingsCard icon={MessageSquareIcon} title="Google Chat"
      badge={link.linked ? <Badge><Trans>Linked</Trans></Badge> : <Badge variant="outline"><Trans>Not linked</Trans></Badge>}
      description={link.linked
        ? t`The TrackLin.es app messages you in Google Chat when you’re assigned a ticket, mentioned, or something needs your review.`
        : t`Get your notifications in Google Chat: find “TrackLin.es” in Google Chat, send it a message, and open the link it sends you.`}>
      {link.linked && <Button variant="outline" size="sm" disabled={busy} onClick={onUnlink}>{busy ? <Trans>Unlinking…</Trans> : <Trans>Unlink</Trans>}</Button>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </SettingsCard>
  );
}

// The /chat/link page (TL-289): checking the code, asking which Google account (audit: never link
// on page load, since the link may be someone else's), linking, linked, or why not.
export type LinkResult = 'checking' | { confirm: string } | 'linking' | 'linked' | { error: string };

// linkError: what went wrong, in words someone can act on.
export function linkError(i18n: I18n, err: unknown): string {
  if (err instanceof ApiError && err.status === 400) return i18n._(msg`This link has expired or was already used. Send the TrackLin.es app a message in Google Chat for a new one.`);
  if (err instanceof ApiError && err.status === 503) return i18n._(msg`Google Chat isn’t set up on this server.`);
  return i18n._(msg`Couldn’t link Google Chat. Please try again.`);
}

// ChatLinkView: pure, for tests.
export function ChatLinkView({ result, onConfirm }: { result: LinkResult; onConfirm?: () => void }) {
  const { t } = useLingui();
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Google Chat</h1>
      {result === 'checking' && <p role="status" className="mt-4 text-muted-foreground"><Trans>Checking the link…</Trans></p>}
      {typeof result === 'object' && 'confirm' in result && (
        <>
          <p className="mt-4"><Trans>Send your TrackLin.es notifications to the Google Chat account <strong>{result.confirm || t`that sent this link`}</strong>?</Trans></p>
          <p className="mt-2 text-sm text-muted-foreground"><Trans>Only link it if that’s your own Google account and you asked the TrackLin.es app for this link yourself. If someone sent it to you, don’t.</Trans></p>
          <Button className="mt-4 mr-2" onClick={onConfirm}><Trans>Link this account</Trans></Button>
        </>
      )}
      {result === 'linking' && <p role="status" className="mt-4 text-muted-foreground"><Trans>Linking your Google Chat…</Trans></p>}
      {result === 'linked' && (
        <>
          <p role="status" className="mt-4"><Trans>You’re linked. The TrackLin.es app will message you in Google Chat when you’re assigned a ticket, mentioned, or something needs your review.</Trans></p>
          <p className="mt-2 text-sm text-muted-foreground"><Trans>You can unlink it any time in Your settings.</Trans></p>
        </>
      )}
      {typeof result === 'object' && 'error' in result && <p role="alert" className="mt-4 text-destructive">{result.error}</p>}
      <Link href="/account" className={buttonVariants({ variant: 'outline', className: 'mt-6' })}><Trans>Go to Your settings</Trans></Link>
    </main>
  );
}

'use client';

import Link from 'next/link';
import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, roadmaps } from '@/lib/api';

// Email subscriptions to a public roadmap's updates (TL-903). Readers aren't signed in: the address
// confirms through a link, and every email carries its own unsubscribe link.

// SubscribeForm: shown on a public roadmap while the backend says can_subscribe.
export function SubscribeForm({ roadmapId }: { roadmapId: string }) {
  const { t, i18n } = useLingui();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function subscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await roadmaps.subscribe(roadmapId, email.trim());
      setSent(true);
    } catch (err) {
      setError(i18n._(subscribeError(err)));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-labelledby="subscribe-heading" className="mt-16 grid max-w-3xl gap-3 rounded-lg border p-5 print:hidden">
      <h2 id="subscribe-heading" className="text-lg font-semibold tracking-tight"><Trans>Get updates by email</Trans></h2>
      {sent ? (
        <p role="status" className="text-sm text-muted-foreground"><Trans>Check your inbox: we’ve sent a link to {email} to confirm.</Trans></p>
      ) : (
        <form onSubmit={subscribe} className="grid gap-2">
          <p className="text-sm text-muted-foreground"><Trans>We’ll email you when this roadmap has a new update. You can unsubscribe from any email.</Trans></p>
          <div className="flex flex-wrap gap-2">
            <Input type="email" required maxLength={254} autoComplete="email" aria-label={t`Email address`} placeholder={t`you@example.com`}
              value={email} onChange={(e) => setEmail(e.target.value)} className="max-w-xs" />
            <Button type="submit" disabled={busy}><Trans>Subscribe</Trans></Button>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
      )}
    </section>
  );
}

// subscribeError: what to tell someone whose subscribe request failed; show it with i18n._().
export const subscribeError = (err: unknown): MessageDescriptor =>
  err instanceof ApiError && err.code === 'invalid_email' ? msg`Enter one email address.`
    : err instanceof ApiError && err.status === 429 ? msg`Too many tries. Please wait a minute and try again.`
      : msg`Couldn’t send the confirmation email. Please try again.`;

// SubscriptionAction: where an email's confirm or unsubscribe link lands. Nothing happens until the
// button is pressed, so a mail scanner that opens links can't confirm or unsubscribe anyone.
export function SubscriptionAction({ roadmapId, action, token }: { roadmapId: string; action: 'confirm' | 'unsubscribe'; token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'invalid' | 'failed'>('idle');
  const confirm = action === 'confirm';
  async function run() {
    setState('busy');
    try {
      await (confirm ? roadmaps.confirmSubscription(token) : roadmaps.unsubscribe(token));
      setState('done');
    } catch (err) {
      setState(err instanceof ApiError && err.status === 404 ? 'invalid' : 'failed');
    }
  }
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">
        {confirm ? <Trans>Confirm your subscription</Trans> : <Trans>Unsubscribe from this roadmap</Trans>}
      </h1>
      {state === 'done' ? (
        <p role="status" className="text-muted-foreground">
          {confirm
            ? <Trans>You’re subscribed. We’ll email you when this roadmap has a new update.</Trans>
            : <Trans>You’re unsubscribed. You won’t get any more emails about this roadmap.</Trans>}
        </p>
      ) : (
        <>
          <p className="text-muted-foreground">
            {confirm
              ? <Trans>Get this roadmap’s updates by email.</Trans>
              : <Trans>Stop getting this roadmap’s updates by email.</Trans>}
          </p>
          <Button onClick={run} disabled={state === 'busy'}>
            {confirm ? <Trans>Confirm subscription</Trans> : <Trans>Unsubscribe</Trans>}
          </Button>
          {state === 'invalid' && <p role="alert" className="text-sm text-destructive"><Trans>This link no longer works. Subscribe again from the roadmap.</Trans></p>}
          {state === 'failed' && <p role="alert" className="text-sm text-destructive"><Trans>Something went wrong. Please try again.</Trans></p>}
        </>
      )}
      <Link href={`/r/${roadmapId}`} className={buttonVariants({ variant: 'outline' })}><Trans>View roadmap</Trans></Link>
    </main>
  );
}

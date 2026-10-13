'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, enquiries, type Enquiry } from '@/lib/api';

type State = { status: 'idle' | 'sending' | 'sent' } | { status: 'error'; message: string };

// sendError: what the person sees when their message didn't go.
export function sendError(err: unknown): string {
  if (err instanceof ApiError && err.status === 429) return 'Too many messages from your connection. Please try again in a minute.';
  if (err instanceof ApiError && err.status === 400) return 'Please give your name, a valid email address and a message.';
  return 'We couldn’t send your message. Please try again.';
}

// ContactForm: reaches the Tracklines team (enquiries are filed in ChewedFeed HQ). The hidden
// "website" field is a honeypot: people never see it, bots fill it in.
export function ContactForm({ sourcePath, send = enquiries.send }: { sourcePath: string; send?: (e: Enquiry) => Promise<void> }) {
  const [state, setState] = useState<State>({ status: 'idle' });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? '').trim();
    setState({ status: 'sending' });
    try {
      await send({ name: field('name'), email: field('email'), company: field('company') || undefined, message: field('message'), source_path: sourcePath,
        ...(field('website') && { website: field('website') }) });
      setState({ status: 'sent' });
    } catch (err) {
      setState({ status: 'error', message: sendError(err) });
    }
  }

  if (state.status === 'sent') {
    return <p role="status" className="rounded-xl border p-6">Thanks, your message is on its way. We&apos;ll reply to the email address you gave.</p>;
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">Name<Input name="name" required maxLength={160} autoComplete="name" /></label>
        <label className="grid gap-1.5 text-sm font-medium">Email<Input name="email" type="email" required maxLength={320} autoComplete="email" /></label>
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        <span>Company <span className="font-normal text-muted-foreground">(optional)</span></span>
        <Input name="company" maxLength={160} autoComplete="organization" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">Message<Textarea name="message" required maxLength={5000} rows={6} /></label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" defaultValue="" />
      {state.status === 'error' && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" className="justify-self-start" disabled={state.status === 'sending'}>{state.status === 'sending' ? 'Sending…' : 'Send message'}</Button>
    </form>
  );
}

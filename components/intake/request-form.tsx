'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ApiError, intake, type IntakeRequest } from '@/lib/api';

export type FormState = 'loading' | 'closed' | 'open' | 'sent';

// sendError says what went wrong sending a request, in words a visitor can act on.
export function sendError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400) return 'Please add a title (up to 200 characters) and choose bug or feature.';
    if (err.status === 404) return 'This form isn’t taking requests any more.';
    if (err.status === 429) return 'You’ve sent a few requests already. Please try again in an hour.';
  }
  return 'Couldn’t send your request. Please try again.';
}

// RequestPage: the public form behind a project's unlisted link. It never shows anything about the project.
export function RequestPage({ token }: { token: string }) {
  const [state, setState] = useState<FormState>('loading');
  useEffect(() => {
    intake.form(token).then((f) => setState(f.open ? 'open' : 'closed'), () => setState('closed'));
  }, [token]);
  return <RequestFormView state={state} onSend={async (req) => { await intake.submit(token, req); setState('sent'); }} onAnother={() => setState('open')} />;
}

// RequestFormView: the form and its states (pure, for tests).
export function RequestFormView({ state, onSend, onAnother }: { state: FormState; onSend: (req: IntakeRequest) => Promise<void>; onAnother: () => void }) {
  const [type, setType] = useState<'bug' | 'feature'>('bug');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [contact, setContact] = useState('');
  const [website, setWebsite] = useState(''); // honeypot: people never see it
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (state === 'loading') return <p role="status" className="text-muted-foreground">Loading…</p>;
  if (state === 'closed') {
    return (
      <div className="grid gap-2">
        <h1 className="text-2xl font-bold tracking-tight">This form is closed</h1>
        <p className="text-muted-foreground">It isn&apos;t taking requests right now, or the link has changed. Ask whoever shared it for a new one.</p>
      </div>
    );
  }
  if (state === 'sent') {
    return (
      <div role="status" className="grid gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Thanks, we&apos;ve got it</h1>
        <p className="text-muted-foreground">The team will look at your request. {contact ? 'If they need more, they can reach you on the contact you gave.' : ''}</p>
        <Button variant="outline" className="justify-self-start" onClick={() => { setTitle(''); setDetails(''); setError(''); onAnother(); }}>Send another</Button>
      </div>
    );
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please add a title.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await onSend({ type, title: title.trim(), details: details.trim(), contact: contact.trim(), ...(website && { website }) });
    } catch (err) {
      setError(sendError(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Send a request</h1>
        <p className="text-muted-foreground">Report a bug or suggest a feature. You don&apos;t need an account.</p>
      </div>
      <div className="grid gap-1.5 text-sm font-medium">
        <span id="request-type">What is it?</span>
        <ToggleGroup variant="outline" aria-labelledby="request-type" value={[type]} onValueChange={(v) => v[0] && setType(v[0] as 'bug' | 'feature')}>
          <ToggleGroupItem value="bug">Bug report</ToggleGroupItem>
          <ToggleGroupItem value="feature">Feature request</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        <span>Title</span>
        <Input value={title} maxLength={200} required aria-invalid={error === 'Please add a title.'} onChange={(e) => setTitle(e.target.value)}
          placeholder={type === 'bug' ? 'e.g. The save button does nothing' : 'e.g. Export to CSV'} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        <span>Details <span className="font-normal text-muted-foreground">(optional)</span></span>
        <textarea value={details} maxLength={5000} rows={6} onChange={(e) => setDetails(e.target.value)}
          placeholder={type === 'bug' ? 'What happened, what you expected, and how to make it happen again.' : 'What would it help you do?'}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-normal outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        <span>How can we reach you? <span className="font-normal text-muted-foreground">(optional, seen by the team only)</span></span>
        <Input value={contact} maxLength={200} autoComplete="email" onChange={(e) => setContact(e.target.value)} placeholder="Email or name" />
      </label>
      {/* honeypot: hidden from people and screen readers; bots that fill it are dropped */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" /></label>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="justify-self-start" disabled={sending}>{sending ? 'Sending…' : 'Send request'}</Button>
    </form>
  );
}

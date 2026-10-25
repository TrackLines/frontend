'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/copy-link';
import { When } from '@/components/when';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ApiError, WEBHOOK_EVENTS, webhooks, type WebhookDelivery, type WebhookEndpoint, type WebhookEvent } from '@/lib/api';
import { useToken } from '@/lib/use-token';

// webhookURL: what the backend will take: https, a real host (it also refuses private addresses).
export function webhookURL(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' && u.hostname.includes('.') ? u.toString() : null;
  } catch {
    return null;
  }
}

const host = (url: string) => { try { return new URL(url).host; } catch { return url; } };

// WebhooksSettings: the org's outbound webhooks (TL-636): add an endpoint and pick its events, see the
// signing secret once, turn it off and on, rotate the secret, send a test, and read the delivery log.
export function WebhooksSettings() {
  const token = useToken();
  const { t } = useLingui();
  const [list, setList] = useState<WebhookEndpoint[] | null>(null);
  const [plan, setPlan] = useState(true); // false: Free, webhooks need Pro or Enterprise
  const [error, setError] = useState('');
  const [secret, setSecret] = useState<{ id: string; value: string } | null>(null); // shown once
  const [open, setOpen] = useState<string | null>(null); // an endpoint's delivery log
  const signedIn = token !== null;
  useEffect(() => {
    if (!token) return;
    webhooks.list(token).then(setList, (e) => {
      if (e instanceof ApiError && e.status === 402) { setPlan(false); setList([]); } else setError(t`Couldn’t load your webhooks.`);
    });
  }, [signedIn]);

  async function act(f: () => Promise<void>) {
    setError('');
    try {
      await f();
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) setPlan(false);
      setError(e instanceof ApiError && e.status < 500 ? e.message : t`That didn’t work. Please try again.`);
    }
  }
  const replace = (w: WebhookEndpoint) => setList((l) => l?.map((x) => (x.id === w.id ? w : x)) ?? l);

  if (!plan) return (
    <p className="text-sm text-muted-foreground" data-webhooks-plan>
      <Trans>Webhooks come with the Pro and Enterprise plans. <Link href="/settings" className="font-medium text-foreground underline">Change your plan</Link> to use them.</Trans>
    </p>
  );
  if (!list) return <p role="status" className="text-sm text-muted-foreground">{error || <Trans>Loading…</Trans>}</p>;
  return (
    <div className="grid gap-8">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {secret && (
        <section role="status" className="grid gap-2 rounded-lg border border-amber-500/50 p-4 text-sm">
          <p className="font-medium"><Trans>Your signing secret. Copy it now: it won’t be shown again.</Trans></p>
          <div className="flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1">{secret.value}</code><CopyButton value={secret.value} label={t`Copy secret`} /></div>
          <p className="text-muted-foreground"><Trans>Use it to check that requests really come from TrackLin.es: see <Link href="/docs/webhooks" className="underline">verifying webhooks</Link>.</Trans></p>
          <Button size="sm" variant="outline" className="w-fit" onClick={() => setSecret(null)}><Trans>I’ve saved it</Trans></Button>
        </section>
      )}
      {list.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>No webhooks yet.</Trans></p> : (
        <ul className="grid gap-3">
          {list.map((w) => (
            <li key={w.id} className="grid gap-2 rounded-lg border p-4" data-webhook={w.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">{w.url}</span>
                {w.enabled ? <Badge variant="secondary"><Trans>On</Trans></Badge> : <Badge variant="outline" className="text-muted-foreground"><Trans>Off</Trans></Badge>}
              </div>
              {w.disabled_reason === 'failures' && <p role="alert" className="text-sm text-destructive"><Trans>Turned off after repeated failed deliveries. Fix the endpoint, then turn it back on.</Trans></p>}
              <p className="text-xs text-muted-foreground">{w.events.join(' · ')} · <Trans>secret ends …{w.secret_hint}</Trans> · <Trans>added <When iso={w.created_at} /></Trans></p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => act(async () => replace(await webhooks.update(w.id, { enabled: !w.enabled }, token!)))}>{w.enabled ? <Trans>Turn off</Trans> : <Trans>Turn on</Trans>}</Button>
                <Button size="sm" variant="outline" disabled={!w.enabled} onClick={() => act(async () => { await webhooks.test(w.id, token!); setOpen(w.id); })}><Trans>Send a test</Trans></Button>
                <Button size="sm" variant="outline" onClick={() => act(async () => setSecret({ id: w.id, value: (await webhooks.rotate(w.id, token!)).secret }))}><Trans>New secret</Trans></Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(open === w.id ? null : w.id)}>{open === w.id ? <Trans>Hide deliveries</Trans> : <Trans>Deliveries</Trans>}</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                  if (window.confirm(t`Delete the webhook to ${host(w.url)}? Nothing more will be sent to it.`)) void act(async () => { await webhooks.remove(w.id, token!); setList((l) => l?.filter((x) => x.id !== w.id) ?? l); });
                }}><Trans>Delete</Trans></Button>
              </div>
              {open === w.id && token && <Deliveries endpoint={w.id} token={token} />}
            </li>
          ))}
        </ul>
      )}
      {list.length < 10 ? <AddWebhook onAdded={(w, s) => { setList((l) => [...(l ?? []), w]); setSecret({ id: w.id, value: s }); }} act={act} token={token!} />
        : <p className="text-sm text-muted-foreground"><Trans>An organization can have up to 10 webhooks.</Trans></p>}
    </div>
  );
}

function AddWebhook({ onAdded, act, token }: { onAdded: (w: WebhookEndpoint, secret: string) => void; act: (f: () => Promise<void>) => Promise<void>; token: string }) {
  const { t } = useLingui();
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<WebhookEvent[]>(['ticket.created', 'ticket.moved', 'ticket.done']);
  const [problem, setProblem] = useState('');
  async function add() {
    const ok = webhookURL(url);
    if (!ok) return setProblem(t`Enter an https address, like https://example.com/hooks/tracklines.`);
    if (events.length === 0) return setProblem(t`Pick at least one event.`);
    setProblem('');
    await act(async () => { const r = await webhooks.create({ url: ok, events }, token); onAdded(r.endpoint, r.secret); setUrl(''); });
  }
  return (
    <section aria-labelledby="add-webhook" className="grid gap-3">
      <h2 id="add-webhook" className="font-semibold"><Trans>Add a webhook</Trans></h2>
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hooks/tracklines" aria-label={t`Endpoint URL`} />
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium"><Trans>Send these events</Trans></legend>
        {WEBHOOK_EVENTS.map((e) => (
          <label key={e} className="flex items-center gap-2 text-sm">
            <Checkbox checked={events.includes(e)} onCheckedChange={(on) => setEvents((cur) => (on ? [...cur, e] : cur.filter((x) => x !== e)))} />
            <code>{e}</code>
          </label>
        ))}
      </fieldset>
      {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
      <Button className="w-fit" onClick={() => void add()}><Trans>Add webhook</Trans></Button>
    </section>
  );
}

// Deliveries: an endpoint's last 30 days of deliveries, newest first, each with what was sent and what
// came back, and a way to send it again.
export function Deliveries({ endpoint, token, initial }: { endpoint: string; token: string; initial?: WebhookDelivery[] }) {
  const { t } = useLingui();
  const [list, setList] = useState<WebhookDelivery[] | null>(initial ?? null);
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(1);
  useEffect(() => {
    if (initial) return;
    webhooks.deliveries(endpoint, page, token).then((r) => { setList((l) => (page === 1 ? r.deliveries : [...(l ?? []), ...r.deliveries])); setMore(r.more); }, () => setList([]));
  }, [endpoint, page]);
  if (!list) return <p role="status" className="text-sm text-muted-foreground"><Trans>Loading deliveries…</Trans></p>;
  if (list.length === 0) return <p className="text-sm text-muted-foreground"><Trans>Nothing sent in the last 30 days.</Trans></p>;
  return (
    <div className="grid gap-2">
      <ul className="grid gap-1 text-sm">
        {list.map((d) => (
          <li key={d.id}>
            <details className="rounded-md border px-3 py-2">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                <Badge variant={d.state === 'failed' ? 'destructive' : d.state === 'ok' ? 'secondary' : 'outline'}>
                  {d.state === 'ok' ? t`Delivered` : d.state === 'failed' ? t`Failed` : t`Pending`}
                </Badge>
                <code>{d.event}</code>
                {d.status_code != null && <span className="text-muted-foreground">HTTP {d.status_code}</span>}
                {d.duration_ms != null && <span className="text-muted-foreground">{d.duration_ms} ms</span>}
                <span className="text-muted-foreground">{t`attempt ${d.attempts}`}</span>
                <span className="ml-auto text-muted-foreground"><When iso={d.created_at} /></span>
              </summary>
              <div className="mt-2 grid gap-2">
                {d.error && <p className="text-destructive">{d.error}</p>}
                <p className="text-xs font-medium uppercase text-muted-foreground"><Trans>Sent</Trans></p>
                <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-xs">{d.request_body}</pre>
                {d.response_body != null && <>
                  <p className="text-xs font-medium uppercase text-muted-foreground"><Trans>Response</Trans></p>
                  <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-xs">{d.response_body}</pre>
                </>}
                <Button size="sm" variant="outline" className="w-fit" onClick={() => void webhooks.redeliver(endpoint, d.id, token).then(() => setList((l) => l?.map((x) => (x.id === d.id ? { ...x, state: 'pending' } : x)) ?? l))}>
                  <Trans>Send again</Trans>
                </Button>
              </div>
            </details>
          </li>
        ))}
      </ul>
      {more && <Button size="sm" variant="ghost" className="w-fit" onClick={() => setPage((p) => p + 1)}><Trans>Show older</Trans></Button>}
    </div>
  );
}

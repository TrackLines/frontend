'use client';

import { plural } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/copy-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { embed, type EmbedKey, type EmbedOrigin, type EmbedUsage } from '@/lib/api';
import { useToken } from '@/lib/use-token';

// normalizeOrigin mirrors the backend: a bare web origin (scheme://host[:port]), lowercased, no path,
// or null. Uses the platform URL parser rather than hand-rolling one.
export function normalizeOrigin(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || !u.host) return null;
    return `${u.protocol}//${u.host.toLowerCase()}`;
  } catch {
    return null;
  }
}

type Data = { origins: EmbedOrigin[]; can_manage: boolean };

// EmbeddingSettings: the org's allowed embed origins and the snippets to paste on a site. The list is
// the opt-in — a widget only works from an origin that's on it (TL-494).
export function EmbeddingSettings() {
  const token = useToken();
  const { t } = useLingui();
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const signedIn = token !== null;
  useEffect(() => {
    if (token) embed.origins(token).then(setData, () => setError(t`Couldn’t load embedding settings.`));
  }, [signedIn]);

  async function add(raw: string) {
    const origin = normalizeOrigin(raw);
    if (!origin) {
      setError(t`Enter an origin like https://example.com.`);
      return false;
    }
    if (data?.origins.some((o) => o.origin === origin)) {
      setError(t`That origin is already allowed.`);
      return false;
    }
    setBusy(true);
    setError('');
    try {
      const created = await embed.addOrigin(origin, token!);
      setData((d) => (d ? { ...d, origins: [...d.origins, created].sort((a, b) => a.origin.localeCompare(b.origin)) } : d));
      return true;
    } catch {
      setError(t`Couldn’t add that origin. Please try again.`);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError('');
    try {
      await embed.removeOrigin(id, token!);
      setData((d) => (d ? { ...d, origins: d.origins.filter((o) => o.id !== id) } : d));
    } catch {
      setError(t`Couldn’t remove that origin. Please try again.`);
    } finally {
      setBusy(false);
    }
  }

  // Embed keys (usage stats) — loaded and managed alongside the origins.
  const [keys, setKeys] = useState<{ keys: EmbedKey[]; can_manage: boolean } | null>(null);
  const [usage, setUsage] = useState<Record<string, EmbedUsage[]>>({});
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState('');
  useEffect(() => {
    if (token) embed.keys(token).then(setKeys, () => setKeyError(t`Couldn’t load embed keys.`));
  }, [signedIn]);

  async function createKey(label: string) {
    setKeyBusy(true);
    setKeyError('');
    try {
      const created = await embed.createKey(label.trim(), token!);
      setKeys((k) => (k ? { ...k, keys: [created, ...k.keys] } : k));
      return true;
    } catch {
      setKeyError(t`Couldn’t create that key. Please try again.`);
      return false;
    } finally {
      setKeyBusy(false);
    }
  }

  async function deleteKey(id: string) {
    setKeyBusy(true);
    setKeyError('');
    try {
      await embed.deleteKey(id, token!);
      setKeys((k) => (k ? { ...k, keys: k.keys.filter((x) => x.id !== id) } : k));
      setUsage((u) => { const { [id]: _drop, ...rest } = u; return rest; });
    } catch {
      setKeyError(t`Couldn’t delete that key. Please try again.`);
    } finally {
      setKeyBusy(false);
    }
  }

  function showUsage(id: string) {
    if (!token || usage[id]) return;
    embed.keyUsage(id, token).then((rows) => setUsage((u) => ({ ...u, [id]: rows })), () => {});
  }

  return (
    <div className="grid gap-8">
      <EmbeddingView data={data} busy={busy} error={error} onAdd={add} onRemove={(id) => void remove(id)} />
      <EmbedsView
        data={keys}
        usage={usage}
        busy={keyBusy}
        error={keyError}
        onCreate={createKey}
        onDelete={(id) => void deleteKey(id)}
        onShowUsage={showUsage}
      />
    </div>
  );
}

// EmbeddingView: pure, for tests.
export function EmbeddingView({ data, busy, error, onAdd, onRemove, origin }: {
  data: Data | null;
  busy: boolean;
  error: string;
  onAdd: (raw: string) => Promise<boolean> | boolean;
  onRemove: (id: string) => void;
  origin?: string;
}) {
  const { t } = useLingui();
  const [value, setValue] = useState('');
  const site = origin ?? (typeof window === 'undefined' ? 'https://tracklin.es' : window.location.origin);
  const roadmapSnippet = `<script src="${site}/embed.js" data-roadmap="YOUR_ROADMAP_ID"></script>`;
  const requestSnippet = `<script src="${site}/embed.js" data-request="YOUR_REQUEST_TOKEN"></script>`;
  const canManage = !!data?.can_manage;

  async function submit() {
    if (!value.trim()) return;
    if (await onAdd(value)) setValue('');
  }

  return (
    <div className="grid gap-5 text-sm">
      <p className="text-muted-foreground">
        <Trans>Put a public roadmap or your request form on your own site. A widget runs on your page and calls TrackLin.es, so
        every site it runs on must be listed here first — otherwise the browser blocks it. Adding a site is what turns
        embedding on.</Trans>
      </p>

      <section className="grid gap-2">
        <h2 className="font-semibold"><Trans>Allowed sites</Trans></h2>
        {data === null ? (
          !error && <p role="status" className="text-muted-foreground"><Trans>Loading…</Trans></p>
        ) : data.origins.length === 0 ? (
          <p className="text-muted-foreground">{canManage ? <Trans>No sites yet. Add one below to start embedding.</Trans> : <Trans>No sites yet.</Trans>}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {data.origins.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <code className="min-w-0 break-all font-mono text-xs">{o.origin}</code>
                {canManage && (
                  <Button type="button" size="xs" variant="ghost" className="text-destructive" disabled={busy} onClick={() => onRemove(o.id)}><Trans>Remove</Trans></Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canManage ? (
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://example.com" aria-label={t`Site origin`} className="max-w-xs" />
            <Button type="submit" size="sm" disabled={busy || !value.trim()}><Trans>Add site</Trans></Button>
          </form>
        ) : (
          data !== null && <p className="text-muted-foreground"><Trans>Only organization admins can add or remove sites.</Trans></p>
        )}
        {error && <p role="alert" className="text-destructive">{error}</p>}
      </section>

      <section className="grid gap-3">
        <h2 className="font-semibold"><Trans>Paste on your site</Trans></h2>
        <Snippet label={t`Roadmap`} hint={t`Replace YOUR_ROADMAP_ID with the roadmap’s id (it’s in the roadmap’s share link, /r/<id>).`} code={roadmapSnippet} />
        <Snippet label={t`Request form`} hint={t`Replace YOUR_REQUEST_TOKEN with your form’s token (Settings → project → request form).`} code={requestSnippet} />
      </section>
    </div>
  );
}

// EmbedsView: the usage keys section — create a named key, see its usage, copy its snippets. Pure.
export function EmbedsView({ data, usage, busy, error, onCreate, onDelete, onShowUsage, origin }: {
  data: { keys: EmbedKey[]; can_manage: boolean } | null;
  usage: Record<string, EmbedUsage[]>;
  busy: boolean;
  error: string;
  onCreate: (label: string) => Promise<boolean> | boolean;
  onDelete: (id: string) => void;
  onShowUsage: (id: string) => void;
  origin?: string;
}) {
  const { t } = useLingui();
  const [label, setLabel] = useState('');
  const site = origin ?? (typeof window === 'undefined' ? 'https://tracklin.es' : window.location.origin);
  const canManage = !!data?.can_manage;

  async function create() {
    if (!label.trim()) return;
    if (await onCreate(label)) setLabel('');
  }

  return (
    <div className="grid gap-3 text-sm">
      <div>
        <h2 className="font-semibold"><Trans>Embeds &amp; usage</Trans></h2>
        <p className="text-muted-foreground">
          <Trans>A key labels an embed so you can see how often it’s used and on which sites. Add it to the snippet as
          <code className="mx-1 font-mono text-xs">data-key</code>. It isn’t a secret and doesn’t grant access — a site still
          has to be in the allowed list above.</Trans>
        </p>
      </div>

      {canManage && (
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void create(); }}>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t`Name this embed, e.g. Marketing site`} aria-label={t`Embed name`} maxLength={100} className="max-w-xs" />
          <Button type="submit" size="sm" disabled={busy || !label.trim()}><Trans>Create key</Trans></Button>
        </form>
      )}
      {error && <p role="alert" className="text-destructive">{error}</p>}

      {data === null ? (
        !error && <p role="status" className="text-muted-foreground"><Trans>Loading…</Trans></p>
      ) : data.keys.length === 0 ? (
        <p className="text-muted-foreground">{canManage ? <Trans>No embed keys yet. Create one to track usage.</Trans> : <Trans>No embed keys yet.</Trans>}</p>
      ) : (
        <ul className="grid gap-4">
          {data.keys.map((k) => (
            <li key={k.id} className="grid gap-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{k.label || t`Untitled embed`}</span>
                {canManage && <Button type="button" size="xs" variant="ghost" className="text-destructive" disabled={busy} onClick={() => onDelete(k.id)}><Trans>Delete</Trans></Button>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 break-all rounded bg-muted px-2 py-1 font-mono text-xs select-all">{k.key}</code>
                <CopyButton value={k.key} label={t`Copy key`} size="sm" ariaLabel={k.label ? t`Copy ${k.label} key` : t`Copy embed key`} />
              </div>
              <p className="text-xs text-muted-foreground">
                {k.hits === 0 ? t`No hits yet.` : k.last_used
                  ? t`${plural(k.hits, { one: '# hit', other: '# hits' })} · ${plural(k.origins, { one: '# site', other: '# sites' })} · last ${k.last_used}`
                  : t`${plural(k.hits, { one: '# hit', other: '# hits' })} · ${plural(k.origins, { one: '# site', other: '# sites' })}`}
              </p>
              {k.hits > 0 && (
                usage[k.id] ? (
                  <ul className="grid gap-0.5 text-xs text-muted-foreground">
                    {usage[k.id].length === 0 ? <li><Trans>No sites recorded.</Trans></li> : usage[k.id].map((u, i) => (
                      <li key={i}><span className="font-mono">{u.origin}</span> · {u.resource} · {u.hits.toLocaleString()}</li>
                    ))}
                  </ul>
                ) : (
                  <Button type="button" size="xs" variant="ghost" className="justify-self-start" onClick={() => onShowUsage(k.id)}><Trans>View sites</Trans></Button>
                )
              )}
              <Snippet label={t`Roadmap`} hint={t`Replace YOUR_ROADMAP_ID with the roadmap’s id (its share link, /r/<id>).`} code={`<script src="${site}/embed.js" data-roadmap="YOUR_ROADMAP_ID" data-key="${k.key}"></script>`} />
              <Snippet label={t`Request form`} hint={t`Replace YOUR_REQUEST_TOKEN with your form’s token (Settings → project → request form).`} code={`<script src="${site}/embed.js" data-request="YOUR_REQUEST_TOKEN" data-key="${k.key}"></script>`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Snippet({ label, hint, code }: { label: string; hint: string; code: string }) {
  const { t } = useLingui();
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <span className="font-medium">{label}</span>
        <CopyButton value={code} label={t`Copy`} size="sm" ariaLabel={t`Copy ${label} embed snippet`} />
      </div>
      <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs select-all">{code}</code>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

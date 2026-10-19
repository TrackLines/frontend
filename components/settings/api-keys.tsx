'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ListPageSkeleton } from '@/components/page-skeletons';
import { AGENTS, McpInstructions } from '@/components/mcp-connect';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError, apiKeys, type ApiKey, type ApiKeyClient, type ApiKeyKind, type NewApiKey } from '@/lib/api';

const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const day = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

// LIFETIMES: how long a new key works (TL-433); the backend allows 1 to 366 days, 90 by default.
export const LIFETIMES = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 180, label: '180 days' },
  { days: 366, label: '1 year and a day' },
] as const;
export const DEFAULT_DAYS = 90;
const SOON_DAYS = 14;

// expiry: what a key's row says about when it stops working, and whether to warn (14 days or less).
export function expiry(expiresAt: string | undefined, now = new Date()): { text: string; warn: boolean } | null {
  if (!expiresAt) return null;
  const at = new Date(expiresAt);
  const days = Math.ceil((at.getTime() - now.getTime()) / 86_400_000);
  if (days <= 0) return { text: 'expired: make a new key', warn: true };
  if (days <= SOON_DAYS) return { text: `expires in ${days} day${days === 1 ? '' : 's'}`, warn: true };
  return { text: `expires ${day.format(at)}`, warn: false };
}

export type FreshKeyInfo = { name: string; kind: ApiKeyKind; key: string; client?: ApiKeyClient | null };

// MAX_LABEL: what an "other" agent can be called (the backend's apikeys.MaxLabel).
export const MAX_LABEL = 40;

// splitSecret: a newly created key's secret is shown once and never kept with the list.
export function splitSecret(created: ApiKey & { key: string }): { listed: ApiKey; secret: string } {
  const { key, ...listed } = created;
  return { listed, secret: key };
}

// KIND_LABEL: what each kind of key is called in lists and the form.
export const KIND_LABEL: Record<ApiKeyKind, string> = { ai: 'AI agent', service: 'Server / API', personal: 'Personal' };

// keyInput: what the new-key form sends, or null until it's complete (TL-269). Agent keys are named
// by their client (an "other" agent optionally by what it's called); service and personal keys by hand.
export function keyInput(kind: ApiKeyKind, client: ApiKeyClient, label: string, name: string, readOnly = false): NewApiKey | null {
  if (kind !== 'ai') return name.trim() ? { kind, name: name.trim(), ...(readOnly && { read_only: true }) } : null;
  return client === 'other' && label.trim() ? { kind, client, label: label.trim() } : { kind, client };
}

// NewKeyFields: the new-key form's fields (pure, for tests). Agents pick their client and get its
// name; only "Other" asks what the agent is called. Service and personal keys are named by hand and
// can be read-only (TL-451). kinds: the types this page makes; one means no type picker.
export function NewKeyFields({ kinds = ['ai', 'service'], kind, client, label, name, readOnly = false, onKind, onClient, onLabel, onName, onReadOnly = () => {} }: {
  kinds?: ApiKeyKind[]; kind: ApiKeyKind; client: ApiKeyClient; label: string; name: string; readOnly?: boolean;
  onKind: (k: ApiKeyKind) => void; onClient: (c: ApiKeyClient) => void; onLabel: (l: string) => void; onName: (n: string) => void; onReadOnly?: (r: boolean) => void;
}) {
  const types: Record<ApiKeyKind, string> = { ai: 'AI agent', service: 'Server / API integration', personal: 'Personal (acts as you)' };
  return (
    <>
      {kinds.length > 1 && (
        <label className="grid gap-1.5 text-sm font-medium">
          Key type
          <Select items={Object.fromEntries(kinds.map((k) => [k, types[k]]))} value={kind} onValueChange={(v) => v && onKind(v as ApiKeyKind)}>
            <SelectTrigger aria-label="Key type" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {kinds.map((k) => <SelectItem key={k} value={k}>{types[k]}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
      )}
      {kind === 'ai' ? (
        <>
          <label className="grid gap-1.5 text-sm font-medium">
            Which agent?
            <Select items={Object.fromEntries(AGENTS.map((a) => [a.id, a.name]))} value={client} onValueChange={(v) => v && onClient(v as ApiKeyClient)}>
              <SelectTrigger aria-label="Which agent" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGENTS.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          {client === 'other' && (
            <label className="grid gap-1.5 text-sm font-medium">
              What&apos;s the agent called?
              <Input value={label} maxLength={MAX_LABEL} placeholder="e.g. Aider (optional)" onChange={(e) => onLabel(e.target.value)} />
            </label>
          )}
          <p className="text-xs text-muted-foreground">It&apos;s named after the agent: you&apos;ll see “{agentName(client, label)}”, and everyone else sees it with your username, e.g. “{agentName(client, label)} (keloran)”.</p>
        </>
      ) : (
        <>
          <label className="grid gap-1.5 text-sm font-medium">
            Name
            <Input value={name} maxLength={120} placeholder={kind === 'personal' ? 'e.g. TRMNL' : 'e.g. deploys'} onChange={(e) => onName(e.target.value)} />
          </label>
          <label className="flex items-start gap-2 text-sm font-medium">
            <Checkbox checked={readOnly} onCheckedChange={(c) => onReadOnly(c === true)} aria-label="Read only" className="mt-0.5" />
            <span>Read only<span className="block text-xs font-normal text-muted-foreground">It can see tickets but not change anything. Best for displays and anything run by someone else.</span></span>
          </label>
        </>
      )}
    </>
  );
}

// LifetimeField: how long the new key works (TL-433). After that it's refused and needs replacing.
export function LifetimeField({ days, onDays }: { days: number; onDays: (d: number) => void }) {
  const items = Object.fromEntries(LIFETIMES.map((l) => [String(l.days), l.label]));
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      Expires after
      <Select items={items} value={String(days)} onValueChange={(v) => v && onDays(Number(v))}>
        <SelectTrigger aria-label="Expires after" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {LIFETIMES.map((l) => <SelectItem key={l.days} value={String(l.days)}>{l.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="text-xs font-normal text-muted-foreground">After that the key stops working and you make a new one.</span>
    </label>
  );
}

// agentName mirrors the backend's apikeys.DisplayName, for the form's preview.
export function agentName(client: ApiKeyClient, label: string): string {
  const known: Partial<Record<ApiKeyClient, string>> = { 'claude-code': 'Claude', 'claude-desktop': 'Claude', codex: 'Codex', cursor: 'Cursor', vscode: 'Copilot', gemini: 'Gemini' };
  return known[client] ?? (label.trim() || 'AI agent');
}

// NewKeyDialog: create a key; onCreate throws to show an error.
// initialKind: the kind it starts on, the open tab's (TL-391); kinds: the types this page makes.
// Personal keys start read-only (TL-451).
export function NewKeyDialog({ open, onOpenChange, onCreate, initialKind = 'ai', kinds = ['ai', 'service'] }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (input: NewApiKey) => Promise<void>; initialKind?: ApiKeyKind; kinds?: ApiKeyKind[] }) {
  const [kind, setKindState] = useState<ApiKeyKind>(initialKind);
  const [readOnly, setReadOnly] = useState(initialKind === 'personal');
  function setKind(k: ApiKeyKind) { setKindState(k); setReadOnly(k === 'personal'); }
  const [client, setClient] = useState<ApiKeyClient>('claude-code');
  const [label, setLabel] = useState('');
  const [name, setName] = useState('');
  const [days, setDays] = useState<number>(DEFAULT_DAYS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const input = keyInput(kind, client, label, name, readOnly);
  useEffect(() => { if (open) setKind(initialKind); }, [open]); // each time it opens, on the open tab's kind

  function reset() { setKind(initialKind); setClient('claude-code'); setLabel(''); setName(''); setDays(DEFAULT_DAYS); setError(''); }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input) return;
    setSaving(true);
    setError('');
    try {
      await onCreate({ ...input, expires_in_days: days });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Couldn’t create the key. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New API key</DialogTitle>
            <DialogDescription>{kinds.map((k) => KIND_HINT[k]).join(' ')}</DialogDescription>
          </DialogHeader>
          <NewKeyFields kinds={kinds} kind={kind} client={client} label={label} name={name} readOnly={readOnly} onKind={setKind} onClient={setClient} onLabel={setLabel} onName={setName} onReadOnly={setReadOnly} />
          <LifetimeField days={days} onDays={setDays} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving || !input}>{saving ? 'Creating…' : 'Create key'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// SetupDialog: opens as soon as an agent key is made, on that agent's setup steps with the key in them.
export function SetupDialog({ fresh, open, onOpenChange }: { fresh: FreshKeyInfo; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set up {fresh.name}</DialogTitle>
          <DialogDescription>Your new key is already in these steps. Copy it now: it won&apos;t be shown again.</DialogDescription>
        </DialogHeader>
        <McpInstructions apiKey={fresh.key} initial={fresh.client ?? undefined} />
      </DialogContent>
    </Dialog>
  );
}

// FreshKey: the one time the secret is shown, with copy; an agent key can reopen its setup steps.
export function FreshKey({ fresh, copied, onCopy, onSetup }: { fresh: FreshKeyInfo; copied: boolean; onCopy: () => void; onSetup?: () => void }) {
  return (
    <div role="status" className="rounded-xl border border-primary/40 bg-primary/5 p-4">
      <p className="mb-2 font-medium">{{ ai: 'AI key', service: 'Service key', personal: 'Personal key' }[fresh.kind]} for “{fresh.name}” — copy it now, it won&apos;t be shown again.</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded bg-background px-2 py-1.5 text-sm">{fresh.key}</code>
        <Button size="sm" onClick={onCopy}>{copied ? 'Copied' : 'Copy'}</Button>
        {fresh.kind === 'ai' && onSetup && <Button size="sm" variant="outline" onClick={onSetup}>Setup steps</Button>}
      </div>
    </div>
  );
}

// KIND_HINT: one line on what each kind of key is for (the new-key dialog).
const KIND_HINT: Record<ApiKeyKind, string> = {
  ai: 'AI keys can be assigned tickets.',
  service: 'Service keys are for servers and integrations.',
  personal: 'Personal keys act as you, for your own scripts and displays.',
};

// KEY_TABS: each kind of key in its own tab so it's clear which is which (TL-391).
export const KEY_TABS: { kind: ApiKeyKind; name: string; hint: string; empty: string }[] = [
  { kind: 'personal', name: 'Personal', hint: 'Keys that act as you (tl_p_…), for your own scripts and displays such as TRMNL: “my tickets” are yours, and anything they change is recorded as you. Make them read only unless they need to change things.', empty: 'No personal keys yet.' },
  { kind: 'ai', name: 'AI agents', hint: 'One key per AI agent (tl_ai_…). Agents can be assigned tickets, and their work shows as theirs.', empty: 'No AI agent keys yet.' },
  { kind: 'service', name: 'Service keys', hint: 'For servers, scripts and integrations such as Bugfixes (tl_s_…). They can create and update tickets, but can’t be assigned work.', empty: 'No service keys yet.' },
];

// ApiKeyTabs: my keys of the given kinds, each kind apart. manage: the kinds I can revoke (TL-462:
// everyone sees the organization's service keys, only admins revoke them); all of them by default.
export function ApiKeyTabs({ list, tab, onTab, onRevoke, kinds = ['ai', 'service'], manage = kinds }: { list: ApiKey[]; tab: ApiKeyKind; onTab: (kind: ApiKeyKind) => void; onRevoke: (k: ApiKey) => void; kinds?: ApiKeyKind[]; manage?: ApiKeyKind[] }) {
  const tabs = KEY_TABS.filter((t) => kinds.includes(t.kind));
  return (
    <Tabs value={tab} onValueChange={(v) => onTab(v as ApiKeyKind)} className="gap-4">
      <TabsList>
        {tabs.map((t) => <TabsTrigger key={t.kind} value={t.kind}>{t.name} ({list.filter((k) => k.kind === t.kind).length})</TabsTrigger>)}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.kind} value={t.kind} className="grid gap-3">
          <p className="text-sm text-muted-foreground">{t.hint}</p>
          <ApiKeyList list={list.filter((k) => k.kind === t.kind)} onRevoke={manage.includes(t.kind) ? onRevoke : undefined} empty={t.empty} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

// ApiKeyList: my keys by name, kind, prefix and last use; never the secret. No onRevoke: look, don't touch.
export function ApiKeyList({ list, onRevoke, empty = 'No keys yet.' }: { list: ApiKey[]; onRevoke?: (k: ApiKey) => void; empty?: string }) {
  if (list.length === 0) return <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y rounded-xl border">
      {list.map((k) => (
        <li key={k.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
          <span className="font-medium" title={k.client ? `Recorded as ${k.name}` : undefined}>{k.display ?? k.name}</span>
          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{KIND_LABEL[k.kind]}</span>
          {k.read_only && <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Read only</span>}
          <code className="text-sm text-muted-foreground">{k.prefix}…</code>
          <span className="text-sm text-muted-foreground">{k.last_used_at ? `last used ${when.format(new Date(k.last_used_at))}` : 'never used'}</span>
          {(() => {
            const e = expiry(k.expires_at);
            return e && <span className={e.warn ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}>{e.text}</span>;
          })()}
          {onRevoke && <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => onRevoke(k)}>Revoke</Button>}
        </li>
      ))}
    </ul>
  );
}

// ApiKeysManager: the API keys page: list, create and revoke my keys of the given kinds, the first
// kind's tab open. Your settings has personal and AI keys; organization settings has service keys
// (TL-451). Both pages look the same: back link, title with New key, intro, tabs. manage: the kinds I
// can make and revoke, all of them by default (TL-462: only admins manage service keys).
export function ApiKeysManager({ token, kinds, manage = kinds, back, intro }: { token: string; kinds: ApiKeyKind[]; manage?: ApiKeyKind[]; back: { href: string; label: string }; intro: ReactNode }) {
  const [list, setList] = useState<ApiKey[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<FreshKeyInfo | null>(null); // shown once
  const [setupOpen, setSetupOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<ApiKeyKind>(kinds[0]);
  useEffect(() => { apiKeys.list(token).then(setList, () => setFailed(true)); }, []); // load once; token refreshes must not refetch

  if (failed) return <p className="p-8 text-destructive" role="alert">Couldn&apos;t load your API keys. Please refresh to try again.</p>;
  if (!list) return <ListPageSkeleton label="Loading API keys…" action />;

  async function revoke(k: ApiKey) {
    if (!confirm(`Revoke "${k.display ?? k.name}"? Anything using it stops working immediately.`)) return;
    await apiKeys.revoke(k.id, token);
    setList((l) => l && l.filter((x) => x.id !== k.id));
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-6 py-10">
      <div>
        <Link href={back.href} className="text-sm text-muted-foreground hover:underline">← {back.label}</Link>
        <header className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">API keys</h1>
          {manage.length > 0 && <Button onClick={() => setCreating(true)}>New key</Button>}
        </header>
      </div>
      <p className="text-muted-foreground">{intro}</p>
      {fresh && <FreshKey fresh={fresh} copied={copied} onCopy={() => navigator.clipboard.writeText(fresh.key).then(() => setCopied(true))} onSetup={() => setSetupOpen(true)} />}
      <ApiKeyTabs list={list} tab={tab} onTab={setTab} onRevoke={(k) => void revoke(k)} kinds={kinds} manage={manage} />
      {fresh?.kind === 'ai' && <SetupDialog fresh={fresh} open={setupOpen} onOpenChange={setSetupOpen} />}
      <NewKeyDialog
        initialKind={manage.includes(tab) ? tab : manage[0]}
        kinds={manage}
        open={creating}
        onOpenChange={setCreating}
        onCreate={async (input) => {
          const k = await apiKeys.create(input, token).catch((err) => {
            throw new Error(err instanceof ApiError && err.status < 500 ? err.message : 'Couldn’t create the key. Please try again.');
          });
          const { listed, secret } = splitSecret(k);
          setList((l) => [...(l ?? []), listed]);
          setFresh({ name: listed.display ?? listed.name, kind: listed.kind, key: secret, client: listed.client });
          setCopied(false);
          setTab(listed.kind); // show it in its own tab
          setSetupOpen(listed.kind === 'ai'); // straight to that agent's setup steps (TL-269)
        }}
      />
    </main>
  );
}

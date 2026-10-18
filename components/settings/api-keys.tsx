'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AGENTS, McpInstructions } from '@/components/mcp-connect';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ApiKey, ApiKeyClient, ApiKeyKind, NewApiKey } from '@/lib/api';

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

// keyInput: what the new-key form sends, or null until it's complete (TL-269). Agent keys are named
// by their client (an "other" agent optionally by what it's called); script keys by hand.
export function keyInput(kind: ApiKeyKind, client: ApiKeyClient, label: string, name: string): NewApiKey | null {
  if (kind === 'service') return name.trim() ? { kind, name: name.trim() } : null;
  return client === 'other' && label.trim() ? { kind, client, label: label.trim() } : { kind, client };
}

// NewKeyFields: the new-key form's fields (pure, for tests). Agents pick their client and get its
// name; only "Other" asks what the agent is called. Scripts are named by hand.
export function NewKeyFields({ kind, client, label, name, onKind, onClient, onLabel, onName }: {
  kind: ApiKeyKind; client: ApiKeyClient; label: string; name: string;
  onKind: (k: ApiKeyKind) => void; onClient: (c: ApiKeyClient) => void; onLabel: (l: string) => void; onName: (n: string) => void;
}) {
  return (
    <>
      <label className="grid gap-1.5 text-sm font-medium">
        Key type
        <Select items={{ ai: 'AI agent', service: 'Server / API integration' }} value={kind} onValueChange={(v) => v && onKind(v as ApiKeyKind)}>
          <SelectTrigger aria-label="Key type" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ai">AI agent</SelectItem>
            <SelectItem value="service">Server / API integration</SelectItem>
          </SelectContent>
        </Select>
      </label>
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
        <label className="grid gap-1.5 text-sm font-medium">
          Name
          <Input value={name} maxLength={120} placeholder="e.g. deploys" onChange={(e) => onName(e.target.value)} />
        </label>
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
// initialKind: the kind it starts on, the open tab's (TL-391).
export function NewKeyDialog({ open, onOpenChange, onCreate, initialKind = 'ai' }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (input: NewApiKey) => Promise<void>; initialKind?: ApiKeyKind }) {
  const [kind, setKind] = useState<ApiKeyKind>(initialKind);
  const [client, setClient] = useState<ApiKeyClient>('claude-code');
  const [label, setLabel] = useState('');
  const [name, setName] = useState('');
  const [days, setDays] = useState<number>(DEFAULT_DAYS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const input = keyInput(kind, client, label, name);
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
            <DialogDescription>AI keys can be assigned tickets. Service keys are for servers and integrations.</DialogDescription>
          </DialogHeader>
          <NewKeyFields kind={kind} client={client} label={label} name={name} onKind={setKind} onClient={setClient} onLabel={setLabel} onName={setName} />
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
    <div role="status" className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-4">
      <p className="mb-2 font-medium">{fresh.kind === 'ai' ? 'AI key' : 'Service key'} for “{fresh.name}” — copy it now, it won&apos;t be shown again.</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded bg-background px-2 py-1.5 text-sm">{fresh.key}</code>
        <Button size="sm" onClick={onCopy}>{copied ? 'Copied' : 'Copy'}</Button>
        {fresh.kind === 'ai' && onSetup && <Button size="sm" variant="outline" onClick={onSetup}>Setup steps</Button>}
      </div>
    </div>
  );
}

// KEY_TABS: AI keys and service keys, each in its own tab so it's clear which is which (TL-391).
export const KEY_TABS: { kind: ApiKeyKind; name: string; hint: string; empty: string }[] = [
  { kind: 'ai', name: 'AI agents', hint: 'One key per AI agent (tl_ai_…). Agents can be assigned tickets, and their work shows as theirs.', empty: 'No AI agent keys yet.' },
  { kind: 'service', name: 'Service keys', hint: 'For servers, scripts and integrations such as Bugfixes (tl_s_…). They can create and update tickets, but can’t be assigned work.', empty: 'No service keys yet.' },
];

// ApiKeyTabs: my keys, AI agents and service keys apart.
export function ApiKeyTabs({ list, tab, onTab, onRevoke }: { list: ApiKey[]; tab: ApiKeyKind; onTab: (kind: ApiKeyKind) => void; onRevoke: (k: ApiKey) => void }) {
  return (
    <Tabs value={tab} onValueChange={(v) => onTab(v as ApiKeyKind)} className="gap-4">
      <TabsList>
        {KEY_TABS.map((t) => <TabsTrigger key={t.kind} value={t.kind}>{t.name} ({list.filter((k) => k.kind === t.kind).length})</TabsTrigger>)}
      </TabsList>
      {KEY_TABS.map((t) => (
        <TabsContent key={t.kind} value={t.kind} className="grid gap-3">
          <p className="text-sm text-muted-foreground">{t.hint}</p>
          <ApiKeyList list={list.filter((k) => k.kind === t.kind)} onRevoke={onRevoke} empty={t.empty} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

// ApiKeyList: my keys by name, kind, prefix and last use; never the secret.
export function ApiKeyList({ list, onRevoke, empty = 'No keys yet.' }: { list: ApiKey[]; onRevoke: (k: ApiKey) => void; empty?: string }) {
  if (list.length === 0) return <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y rounded-xl border">
      {list.map((k) => (
        <li key={k.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
          <span className="font-medium" title={k.client ? `Recorded as ${k.name}` : undefined}>{k.display ?? k.name}</span>
          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{k.kind === 'ai' ? 'AI agent' : 'Server / API'}</span>
          <code className="text-sm text-muted-foreground">{k.prefix}…</code>
          <span className="text-sm text-muted-foreground">{k.last_used_at ? `last used ${when.format(new Date(k.last_used_at))}` : 'never used'}</span>
          {(() => {
            const e = expiry(k.expires_at);
            return e && <span className={e.warn ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}>{e.text}</span>;
          })()}
          <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => onRevoke(k)}>Revoke</Button>
        </li>
      ))}
    </ul>
  );
}

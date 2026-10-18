import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { agentName, ApiKeyList, DEFAULT_DAYS, expiry, FreshKey, keyInput, LifetimeField, LIFETIMES, NewKeyFields, splitSecret } from './api-keys';
import { McpInstructions } from '@/components/mcp-connect';
import type { ApiKey } from '@/lib/api';

const key: ApiKey = { id: 'k1', name: 'Claude', kind: 'ai', prefix: 'tl_ab12', created_at: '2026-10-01T10:00:00Z', last_used_at: null };

test('the secret is split off a new key: shown once, never kept in the list', () => {
  const { listed, secret } = splitSecret({ ...key, key: 'tl_ab12secret' });
  expect(secret).toBe('tl_ab12secret');
  expect(listed).toEqual(key);
  expect(JSON.stringify(listed)).not.toContain('secret');
});

test('the one-time box shows the key, its kind and a copy button', () => {
  const html = renderToStaticMarkup(<FreshKey fresh={{ name: 'Claude', kind: 'service', key: 'tl_xyz' }} copied={false} onCopy={() => {}} />);
  for (const s of ['Service key for “Claude”', 'won&#x27;t be shown again', '>tl_xyz<', '>Copy<']) expect(html).toContain(s);
  expect(renderToStaticMarkup(<FreshKey fresh={{ name: 'x', kind: 'ai', key: 'k' }} copied onCopy={() => {}} />)).toContain('>Copied<');
});

test('the list shows name, kind, prefix and last use, never a secret; empty says so', () => {
  const html = renderToStaticMarkup(<ApiKeyList list={[key, { ...key, id: 'k2', name: 'Deploys', kind: 'service', last_used_at: '2026-10-05T09:30:00Z' }]} onRevoke={() => {}} />);
  for (const s of ['Claude', 'AI agent', 'tl_ab12…', 'never used', 'Deploys', 'Server / API', 'last used 5 Oct 2026']) expect(html).toContain(s);
  expect(html.match(/>Revoke</g)?.length).toBe(2);
  expect(renderToStaticMarkup(<ApiKeyList list={[]} onRevoke={() => {}} />)).toContain('No keys yet.');
});

test('agent keys are named by their client; only "Other" asks for a name; scripts are named by hand (TL-269)', () => {
  expect(keyInput('ai', 'claude-code', 'ignored', 'ignored')).toEqual({ kind: 'ai', client: 'claude-code' });
  expect(keyInput('ai', 'other', ' Aider ', '')).toEqual({ kind: 'ai', client: 'other', label: 'Aider' });
  expect(keyInput('ai', 'other', '  ', '')).toEqual({ kind: 'ai', client: 'other' });
  expect(keyInput('service', 'claude-code', '', ' deploys ')).toEqual({ kind: 'service', name: 'deploys' });
  expect(keyInput('service', 'claude-code', '', '  ')).toBeNull();
  expect([agentName('claude-code', ''), agentName('vscode', ''), agentName('other', 'Aider'), agentName('other', '')]).toEqual(['Claude', 'Copilot', 'Aider', 'AI agent']);

  const fields = (kind: 'ai' | 'service', client: 'claude-code' | 'other') => renderToStaticMarkup(
    <NewKeyFields kind={kind} client={client} label="" name="" onKind={() => {}} onClient={() => {}} onLabel={() => {}} onName={() => {}} />);
  const claude = fields('ai', 'claude-code');
  expect(claude).toContain('Which agent?');
  expect(claude).not.toContain('agent called');
  expect(claude).not.toContain('>Name<');
  expect(claude).toContain('“Claude (keloran)”');
  expect(fields('ai', 'other')).toContain('What&#x27;s the agent called?');
  const script = fields('service', 'claude-code');
  expect(script).toContain('Name');
  expect(script).not.toContain('Which agent?');
});

test('a new agent key’s setup steps carry the key itself, opened on its client', () => {
  const html = renderToStaticMarkup(<McpInstructions apiKey="tl_realkey123" initial="codex" />);
  expect(html).toContain('tl_realkey123');
  expect(html).not.toContain('tl_ai_your_key');
  expect(renderToStaticMarkup(<McpInstructions />)).toContain('tl_ai_your_key');
  // the one-time box offers the steps again for agent keys only
  expect(renderToStaticMarkup(<FreshKey fresh={{ name: 'Claude', kind: 'ai', key: 'k', client: 'claude-code' }} copied={false} onCopy={() => {}} onSetup={() => {}} />)).toContain('Setup steps');
  expect(renderToStaticMarkup(<FreshKey fresh={{ name: 'deploys', kind: 'service', key: 'k' }} copied={false} onCopy={() => {}} onSetup={() => {}} />)).not.toContain('Setup steps');
});

test('the list calls agent keys by their name, not their generated id', () => {
  const html = renderToStaticMarkup(<ApiKeyList list={[{ ...key, name: 'claude-482193', client: 'claude-code', display: 'Claude' }]} onRevoke={() => {}} />);
  expect(html).toContain('>Claude<');
  expect(html).toContain('Recorded as claude-482193');
});

test('AI agent keys and service keys are in their own tabs, with counts, AI agents first (TL-391)', async () => {
  const { ApiKeyTabs, KEY_TABS } = await import('./api-keys');
  const keys = [
    { id: 'a1', name: 'Claude', kind: 'ai' as const, prefix: 'tl_ai_ab', created_at: '2026-10-01T00:00:00Z', last_used_at: null },
    { id: 'a2', name: 'Codex', kind: 'ai' as const, prefix: 'tl_ai_cd', created_at: '2026-10-02T00:00:00Z', last_used_at: null },
    { id: 's1', name: 'Deploys', kind: 'service' as const, prefix: 'tl_s_ef', created_at: '2026-10-03T00:00:00Z', last_used_at: null },
  ];
  expect(KEY_TABS.map((t) => t.kind)).toEqual(['personal', 'ai', 'service']);
  const ai = renderToStaticMarkup(<ApiKeyTabs list={keys} tab="ai" onTab={() => {}} onRevoke={() => {}} />);
  expect(ai).toContain('AI agents (2)');
  expect(ai).toContain('Service keys (1)');
  expect(ai).toContain('Claude');
  expect(ai).not.toContain('Deploys'); // the service key waits in its own tab
  const service = renderToStaticMarkup(<ApiKeyTabs list={keys} tab="service" onTab={() => {}} onRevoke={() => {}} />);
  expect(service).toContain('Deploys');
  expect(service).not.toContain('Codex');
  expect(renderToStaticMarkup(<ApiKeyTabs list={keys.slice(0, 2)} tab="service" onTab={() => {}} onRevoke={() => {}} />)).toContain('No service keys yet.');
  const manager = await Bun.file(new URL('./api-keys.tsx', import.meta.url)).text();
  expect(manager).toContain('initialKind={tab}'); // New key starts on the open tab's kind
  expect(manager).toContain('setTab(listed.kind)'); // a new key shows in its tab
});

test('AI keys are made in Your settings; the org page has them only behind org-ai-keys (TL-451)', async () => {
  const org = await Bun.file(new URL('../../app/settings/api-keys/page.tsx', import.meta.url)).text();
  expect(org).toContain(`is('org-ai-keys').enabled() ? ['service', 'ai'] : ['service']`);
  // and so is Connect AI on the org Settings card: it only makes sense where AI keys can be made
  const settings = await Bun.file(new URL('../../app/settings/page.tsx', import.meta.url)).text();
  expect(settings).toMatch(/is\('org-ai-keys'\)\.enabled\(\) && \(\s*<McpConnect/);
  // both pages are the same manager, so they look alike: Your settings links to its own page
  expect(org).toContain('<ApiKeysManager');
  const mine = await Bun.file(new URL('../../app/account/api-keys/page.tsx', import.meta.url)).text();
  expect(mine).toContain(`kinds={['personal', 'ai']}`);
  const account = await Bun.file(new URL('../../app/account/page.tsx', import.meta.url)).text();
  expect(account).toContain('href="/account/api-keys"');
});

test('keys expire: a lifetime picker defaulting to 90 days, up to a year and a day (TL-433)', () => {
  expect(DEFAULT_DAYS).toBe(90);
  expect(LIFETIMES.map((l) => l.days)).toEqual([30, 90, 180, 366]);
  const html = renderToStaticMarkup(<LifetimeField days={DEFAULT_DAYS} onDays={() => {}} />);
  expect(html).toContain('Expires after');
  expect(html).toContain('90 days');
});

test('the list says when a key expires, and warns in its last 14 days (TL-433)', () => {
  const now = new Date('2026-10-18T12:00:00Z');
  expect(expiry(undefined, now)).toBeNull();
  expect(expiry('2027-01-16T12:00:00Z', now)).toEqual({ text: 'expires 16 Jan 2027', warn: false });
  expect(expiry('2026-11-01T12:00:00Z', now)).toEqual({ text: 'expires in 14 days', warn: true });
  expect(expiry('2026-10-19T11:00:00Z', now)).toEqual({ text: 'expires in 1 day', warn: true });
  expect(expiry('2026-10-18T11:59:00Z', now)).toEqual({ text: 'expired: make a new key', warn: true });
  const html = renderToStaticMarkup(<ApiKeyList list={[{ ...key, expires_at: '2099-01-01T00:00:00Z' }]} onRevoke={() => {}} />);
  expect(html).toContain('expires 1 Jan 2099');
});

test('personal keys: named by hand, read-only when asked, only the kinds a page makes (TL-451)', async () => {
  const { ApiKeyTabs, KIND_LABEL } = await import('./api-keys');
  expect(keyInput('personal', 'claude-code', '', ' TRMNL ', true)).toEqual({ kind: 'personal', name: 'TRMNL', read_only: true });
  expect(keyInput('personal', 'claude-code', '', 'TRMNL')).toEqual({ kind: 'personal', name: 'TRMNL' });
  expect(keyInput('personal', 'claude-code', '', ' ', true)).toBeNull();
  expect(keyInput('service', 'claude-code', '', 'dash', true)).toEqual({ kind: 'service', name: 'dash', read_only: true });

  const form = (kinds: ('ai' | 'service' | 'personal')[], kind: 'ai' | 'service' | 'personal', readOnly = false) => renderToStaticMarkup(
    <NewKeyFields kinds={kinds} kind={kind} client="claude-code" label="" name="" readOnly={readOnly} onKind={() => {}} onClient={() => {}} onLabel={() => {}} onName={() => {}} />);
  const personal = form(['personal', 'ai'], 'personal', true);
  expect(personal).toContain('Read only');
  expect(personal).toContain('e.g. TRMNL');
  expect(personal).toContain('aria-checked="true"');
  expect(form(['personal', 'ai'], 'ai')).not.toContain('Read only'); // agents work, so they write
  expect(form(['service'], 'service')).not.toContain('Key type'); // one kind: nothing to pick

  const keys: ApiKey[] = [
    { id: 'p1', name: 'TRMNL', kind: 'personal', prefix: 'tl_p_ab', created_at: '2026-10-01T00:00:00Z', last_used_at: null, read_only: true },
    { id: 'a1', name: 'Claude', kind: 'ai', prefix: 'tl_ai_ab', created_at: '2026-10-01T00:00:00Z', last_used_at: null },
    { id: 's1', name: 'Deploys', kind: 'service', prefix: 'tl_s_ef', created_at: '2026-10-03T00:00:00Z', last_used_at: null },
  ];
  // Your settings: personal and AI, never the org's service keys
  const mine = renderToStaticMarkup(<ApiKeyTabs list={keys} tab="personal" kinds={['personal', 'ai']} onTab={() => {}} onRevoke={() => {}} />);
  for (const s of ['Personal (1)', 'AI agents (1)', 'TRMNL', 'Read only', KIND_LABEL.personal]) expect(mine).toContain(s);
  expect(mine).not.toContain('Service keys');
  // organization settings without org-ai-keys: service keys only
  const org = renderToStaticMarkup(<ApiKeyTabs list={keys} tab="service" kinds={['service']} onTab={() => {}} onRevoke={() => {}} />);
  expect(org).toContain('Service keys (1)');
  expect(org).not.toContain('AI agents');
  expect(org).not.toContain('Personal');
});

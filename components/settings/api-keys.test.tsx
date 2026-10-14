import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { agentName, ApiKeyList, FreshKey, keyInput, NewKeyFields, splitSecret } from './api-keys';
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
  expect(html).not.toContain('tl_your_key');
  expect(renderToStaticMarkup(<McpInstructions />)).toContain('tl_your_key');
  // the one-time box offers the steps again for agent keys only
  expect(renderToStaticMarkup(<FreshKey fresh={{ name: 'Claude', kind: 'ai', key: 'k', client: 'claude-code' }} copied={false} onCopy={() => {}} onSetup={() => {}} />)).toContain('Setup steps');
  expect(renderToStaticMarkup(<FreshKey fresh={{ name: 'deploys', kind: 'service', key: 'k' }} copied={false} onCopy={() => {}} onSetup={() => {}} />)).not.toContain('Setup steps');
});

test('the list calls agent keys by their name, not their generated id', () => {
  const html = renderToStaticMarkup(<ApiKeyList list={[{ ...key, name: 'claude-482193', client: 'claude-code', display: 'Claude' }]} onRevoke={() => {}} />);
  expect(html).toContain('>Claude<');
  expect(html).toContain('Recorded as claude-482193');
});

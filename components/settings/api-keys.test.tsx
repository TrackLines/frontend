import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiKeyList, FreshKey, splitSecret } from './api-keys';
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

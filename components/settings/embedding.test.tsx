import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import type { EmbedKey, EmbedOrigin, EmbedUsage } from '@/lib/api';
import { EmbeddingView, EmbedsView, normalizeOrigin } from './embedding';

const origin = (id: string, o: string): EmbedOrigin => ({ id, origin: o, created_by: 'Ava', created_at: '2026-10-21T00:00:00Z' });
const render = (props: Partial<Parameters<typeof EmbeddingView>[0]> = {}) =>
  renderToStaticMarkup(
    <EmbeddingView data={null} busy={false} error="" onAdd={() => true} onRemove={() => {}} origin="https://tracklin.es" {...props} />,
  );

test('normalizeOrigin accepts a web origin and rejects anything else (mirrors the backend)', () => {
  expect(normalizeOrigin('https://example.com')).toBe('https://example.com');
  expect(normalizeOrigin('https://Example.com/roadmap')).toBe('https://example.com'); // lowercased, path dropped
  expect(normalizeOrigin('http://localhost:3000')).toBe('http://localhost:3000');
  for (const bad of ['', 'example.com', '*', 'javascript:alert(1)', 'ftp://example.com']) {
    expect(normalizeOrigin(bad)).toBeNull();
  }
});

test('shows copy-paste snippets for the roadmap and the request form', () => {
  const html = render({ data: { origins: [], can_manage: true } });
  expect(html).toContain('&lt;script src=&quot;https://tracklin.es/embed.js&quot; data-roadmap=');
  expect(html).toContain('data-request=');
  expect(html).toContain('YOUR_ROADMAP_ID');
  expect(html).toContain('YOUR_REQUEST_TOKEN');
});

test('an admin gets the add form and remove buttons; a member does not', () => {
  const data = { origins: [origin('o1', 'https://shop.example')], can_manage: true };
  const admin = render({ data });
  expect(admin).toContain('https://shop.example');
  expect(admin).toContain('Add site');
  expect(admin).toContain('>Remove<');

  const member = render({ data: { ...data, can_manage: false } });
  expect(member).toContain('https://shop.example');
  expect(member).not.toContain('Add site');
  expect(member).not.toContain('>Remove<');
  expect(member).toContain('Only people who manage this project can add or remove sites.');
});

test('empty list tells an admin to add a site; loading shows a status', () => {
  expect(render({ data: { origins: [], can_manage: true } })).toContain('Add one below');
  expect(render({ data: null })).toContain('Loading');
});

const key = (over: Partial<EmbedKey> = {}): EmbedKey => ({
  id: 'k1', key: 'tle_abc', label: 'Marketing', created_by: 'Ava', created_at: '2026-10-21T00:00:00Z',
  hits: 0, origins: 0, last_used: null, ...over,
});
const renderKeys = (props: Partial<Parameters<typeof EmbedsView>[0]> = {}) =>
  renderToStaticMarkup(
    <EmbedsView data={null} usage={{}} busy={false} error="" onCreate={() => true} onDelete={() => {}} onShowUsage={() => {}} origin="https://tracklin.es" {...props} />,
  );

test('a key shows its token and snippets carrying data-key (TL-497)', () => {
  const html = renderKeys({ data: { keys: [key()], can_manage: true } });
  expect(html).toContain('Marketing');
  expect(html).toContain('tle_abc');
  expect(html).toContain('data-key=&quot;tle_abc&quot;');
  expect(html).toContain('data-roadmap=');
  expect(html).toContain('data-request=');
});

test('usage summary and per-site breakdown', () => {
  const noHits = renderKeys({ data: { keys: [key()], can_manage: true } });
  expect(noHits).toContain('No hits yet');

  const used = key({ hits: 12, origins: 2, last_used: '2026-10-21' });
  const usage: Record<string, EmbedUsage[]> = { k1: [{ origin: 'https://shop.example', resource: 'roadmap', hits: 12, last_used: '2026-10-21' }] };
  const html = renderKeys({ data: { keys: [used], can_manage: true }, usage });
  expect(html).toContain('12 hits');
  expect(html).toContain('2 sites');
  expect(html).toContain('https://shop.example');
  expect(html).toContain('roadmap');
});

test('create and delete are for admins only', () => {
  const admin = renderKeys({ data: { keys: [key()], can_manage: true } });
  expect(admin).toContain('Create key');
  expect(admin).toContain('>Delete<');

  const member = renderKeys({ data: { keys: [key()], can_manage: false } });
  expect(member).not.toContain('Create key');
  expect(member).not.toContain('>Delete<');
});

// TL-683: embedding belongs to the project — its own page from Edit project, gone from org settings, and
// every call is the project's
test('embedding lives in the project, not the organization (source)', async () => {
  const read = (p: string) => Bun.file(new URL(p, import.meta.url)).text();
  const edit = await read('../../app/projects/[id]/edit/page.tsx');
  expect(edit).toContain("is('embedding').enabled() && <SettingsCard icon={CodeIcon} title={t`Embedding`} href={`/projects/${project.id}/embedding`}");
  expect(await read('../../app/projects/[id]/embedding/page.tsx')).toContain('<EmbeddingSettings projectId={id} />');
  expect(await read('../../app/settings/page.tsx')).not.toContain('/settings/embedding');
  expect(await Bun.file(new URL('../../app/settings/embedding/page.tsx', import.meta.url)).exists()).toBe(false);
  const api = await read('../../lib/api.ts');
  expect(api).toContain('`/projects/${encodeURIComponent(project)}/embed/${rest}`');
  expect(api).not.toContain("'/embed/origins'");
});

test('the snippets say they work only on the allowed sites', () => {
  expect(render({ data: { origins: [], can_manage: true } })).toContain('They work only on the sites allowed above.');
});

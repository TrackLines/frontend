import { afterEach, expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { linear, type ImportJob, type LinearConnection } from '../api';
import { LINEAR_KEYS, LinearConnectionPanel } from '@/components/settings/linear-import';
import { ImportPreview } from '@/components/settings/jira-import';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('the Linear calls (TL-654 contract)', async () => {
  const asked: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    asked.push(`${init?.method ?? 'GET'} ${String(url).replace(/^.*\/api/, '')}${init?.body ? ` ${init.body}` : ''}`);
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  await linear.connection('t');
  await linear.connect('lin_api_x', 't');
  await linear.extend('t');
  await linear.disconnect('t');
  await linear.preview({ prefix: 'ACME', teams: { 'team:eng': 'team1' } }, 't');
  expect(asked).toEqual([
    'GET /imports/linear/connection',
    'PUT /imports/linear/connection {"key":"lin_api_x"}',
    'POST /imports/linear/connection/extend',
    'DELETE /imports/linear/connection',
    'POST /imports {"source":"linear","options":{"prefix":"ACME","teams":{"team:eng":"team1"}}}',
  ]);
});

const conn: LinearConnection = { workspace: 'Acme', account: 'Sam Doe', created_by: 'u', created_at: '2026-10-26T10:00:00Z', expires_at: '2026-11-25T10:00:00Z' };

test('connecting with a personal API key; connected: the workspace, whose key, until when (TL-655)', () => {
  const form = render(<LinearConnectionPanel conn={null} token="t" onChange={() => {}} />);
  for (const s of ['Connect Linear', LINEAR_KEYS, 'type="password"', 'lin_api_…']) expect(form).toContain(s);
  expect(form).toMatch(/<button[^>]* disabled=""[^>]*>Connect</);
  const on = render(<LinearConnectionPanel conn={conn} token="t" onChange={() => {}} />).replace(/<!-- -->/g, '');
  for (const s of ['<strong>Acme</strong> workspace with Sam Doe’s key', 'until 25 Nov 2026', 'Keep it 30 more days', '>Delete<']) expect(on).toContain(s);
});

const job = (o: Partial<ImportJob>): ImportJob => ({ id: 'i1', source: 'linear', state: 'previewing', progress: 0, total: 0, report: null, ...o });
const preview = (j: ImportJob, prefixes: Record<string, string> = {}) => render(
  <ImportPreview job={j} keyOf={{ org1: 'workspace' }} teams={[]} taken={['TL']} prefixes={prefixes} teamOf={{}} stale={false} single
    setPrefix={() => {}} setTeam={() => {}} />,
).replace(/<!-- -->/g, '');
const acme = { source_id: 'org1', name: 'Acme', prefix: 'ENG2', tickets: 6, boards: [{ source_id: 'team:eng', name: 'Engineering', team_id: null, columns: ['Todo', 'In Progress', 'Done'] }] };

test('the Linear preview: one project, how other teams\' keys change, no unticking (TL-655)', () => {
  const html = preview(job({ projects: [acme], notes: [{ kind: 'renumbered', source_id: 'team:des', message: 'Design\'s 2 issues become ENG2-8 to ENG2-9 (each keeps its link to Linear)' }] }));
  for (const s of ['<strong>Acme</strong>', 'ENG2', 'Todo → In Progress → Done', 'data-note="renumbered"', 'become ENG2-8 to ENG2-9']) expect(html).toContain(s);
  expect(html).not.toContain('so a number was added'); // a workspace has no key of its own
  const limited = preview(job({ projects: [acme], problems: [{ code: 'project_limit', message: 'your plan allows 1' }] }));
  expect(limited).toContain('to import it');
  expect(limited).not.toContain('untick');
  const clash = preview(job({ projects: [acme], problems: [{ code: 'prefix_taken', source_id: 'org1', message: 'taken' }] }), { workspace: 'TL' });
  expect(clash).toContain('data-prefix-input');
  expect(clash).toContain('That prefix is already used.');
});

test('the Linear tab and its link (source)', async () => {
  const read = (p: string) => Bun.file(new URL(p, import.meta.url)).text();
  const page = await read('../../components/settings/import-page.tsx');
  expect(page).toContain('<TabsTrigger value="linear">Linear</TabsTrigger>');
  expect(page).toContain('<LinearImport />');
  expect(await read('../../app/settings/import/linear/page.tsx')).toContain('<ImportSettings initial="linear" />');
});

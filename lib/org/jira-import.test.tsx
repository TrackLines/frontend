import { afterEach, expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { prefixNeeded, prefixProblem } from './jira-import';
import { importsApi, jira, type ImportJob, type JiraConnection } from '../api';
import { JiraConnectionPanel, ImportPreview } from '@/components/settings/jira-import';
import { ImportStatus } from '@/components/settings/csv-import';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('a typed prefix is checked as the backend checks it (TL-543)', () => {
  expect(prefixProblem('SHOP', ['TL'])).toBeNull();
  expect(prefixProblem('SHOP', ['SHOP'])).toBe('taken');
  expect(prefixProblem('shop', [])).toBe('format');
  expect(prefixProblem('1AB', [])).toBe('format');
  expect(prefixProblem('A', [])).toBe('format');
  expect(prefixProblem('ABCDEFG', [])).toBe('format');
  expect([...prefixNeeded([{ code: 'bad_prefix', source_id: '1' }, { code: 'prefix_taken', source_id: '2' }, { code: 'project_limit' }])]).toEqual(['1', '2']);
});

test('the Jira calls (TL-537/538 contract)', async () => {
  const asked: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    asked.push(`${init?.method ?? 'GET'} ${String(url).replace(/^.*\/api/, '')}${init?.body ? ` ${init.body}` : ''}`);
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  await jira.connection('t');
  await jira.connect({ site: 'acme', email: 'sam@acme.io', token: 'secret' }, 't');
  await jira.extend('t');
  await jira.disconnect('t');
  await jira.projects('t');
  await jira.preview({ projects: ['SHOP'], prefixes: { LONGKEY: 'LONG' }, teams: { 'board:7': 'team1' } }, 't');
  await importsApi.cancel('i1', 't');
  expect(asked).toEqual([
    'GET /imports/jira/connection',
    'PUT /imports/jira/connection {"site":"acme","email":"sam@acme.io","token":"secret"}',
    'POST /imports/jira/connection/extend',
    'DELETE /imports/jira/connection',
    'GET /imports/jira/projects',
    'POST /imports {"source":"jira","options":{"projects":["SHOP"],"prefixes":{"LONGKEY":"LONG"},"teams":{"board:7":"team1"}}}',
    'POST /imports/i1/cancel',
  ]);
});

const conn: JiraConnection = { site: 'https://acme.atlassian.net', email: 'sam@acme.io', account: 'Sam Doe', created_by: 'u', created_at: '2026-10-25T10:00:00Z', expires_at: '2026-11-24T10:00:00Z' };

test('connecting: the form with Atlassian\'s token page; connected: whose, until when, extend and delete (TL-542)', () => {
  const form = render(<JiraConnectionPanel conn={null} token="t" onChange={() => {}} />);
  for (const s of ['Connect Jira Cloud', 'https://id.atlassian.com/manage-profile/security/api-tokens', 'type="password"', 'Jira site']) expect(form).toContain(s);
  expect(form).toMatch(/<button[^>]*disabled[^>]*>Connect</); // nothing typed yet
  const on = render(<JiraConnectionPanel conn={conn} token="t" onChange={() => {}} />);
  for (const s of ['<strong>https://acme.atlassian.net</strong>', 'as Sam Doe (sam@acme.io)', 'until 24 Nov 2026', 'Keep it 30 more days', '>Delete<']) expect(on).toContain(s);
});

const preview = (o: Partial<ImportJob>, extra: Partial<Parameters<typeof ImportPreview>[0]> = {}) => render(
  <ImportPreview job={{ id: 'i1', source: 'jira', state: 'previewing', progress: 0, total: 0, report: null, ...o }} keyOf={{ '10000': 'SHOP', '10001': 'LONGKEY' }}
    teams={[{ id: 'team1', org_id: 'o', name: 'Web team', description: '', created_at: '', updated_at: '' }]} taken={['TL']} prefixes={{}} teamOf={{}} stale={false}
    setPrefix={() => {}} setTeam={() => {}} {...extra} />,
);
const shop = { source_id: '10000', name: 'Shop', prefix: 'SHOP2', tickets: 4, boards: [{ source_id: 'board:7', name: 'Shop board', team_id: null, columns: ['To Do', 'In Progress', 'Done'] }] };
const long = { source_id: '10001', name: 'Long', prefix: 'LONGKEY', tickets: 0, boards: [{ source_id: 'board:8', name: 'Thin', team_id: null, columns: ['All'] }] };

test('the preview: projects, a numbered prefix, columns, team pickers and people (TL-543)', () => {
  const html = preview({ planned: { projects: 1, boards: 1, columns: 3, tickets: 4, comments: 2 }, projects: [shop],
    people: [{ name: 'Sam Doe', matched: true, tickets: 3 }, { name: 'Old Name', matched: false, tickets: 1 }] });
  for (const s of ['This makes 1 projects, 1 boards and 4 tickets', '<strong>Shop</strong>', 'SHOP2', '(SHOP is taken here, so a number was added)',
    'To Do → In Progress → Done', 'aria-label="Team for Shop board"', 'Matched to members by email: Sam Doe (3)', 'left unassigned: Old Name (1)']) {
    expect(html.replace(/<!-- -->/g, '')).toContain(s);
  }
  expect(html).not.toContain('data-prefix-input');
});

test('a prefix that can\'t be used asks for one, checked as you type; a board without columns says why; limits link to the plan', () => {
  const problems = [{ code: 'bad_prefix', source_id: '10001', message: 'bad' }, { code: 'board_columns', source_id: 'board:8', message: 'board "Thin" needs at least two columns (To do and Done)' },
    { code: 'project_limit', message: 'this import creates 2 projects; your plan allows 1 and you have 0' }];
  const html = preview({ projects: [shop, long], problems });
  for (const s of ['data-prefix-input', 'LONGKEY can’t be used as a key prefix here', 'needs at least two columns', 'your plan allows 1', 'href="/settings"', 'untick some projects and preview again']) {
    expect(html.replace(/<!-- -->/g, '')).toContain(s);
  }
  expect(preview({ projects: [shop, long], problems }, { prefixes: { LONGKEY: 'SHOP2' } })).toContain('That prefix is already used.'); // another project in the import has it
  expect(preview({ projects: [shop, long], problems }, { prefixes: { LONGKEY: 'TL' } })).toContain('That prefix is already used.'); // one of the org's
  expect(preview({ projects: [shop, long], problems }, { prefixes: { LONGKEY: 'lo' } })).toContain('2 to 6 capital letters');
  expect(preview({ projects: [shop, long], problems }, { prefixes: { LONGKEY: 'LONG' } })).toContain('Free to use: preview again to apply it.');
  expect(preview({ projects: [shop] }, { stale: true })).toContain('preview again before importing');
});

const status = (j: Partial<ImportJob>, cancel = true) => render(<ImportStatus job={{ id: 'i1', source: 'jira', state: 'done', progress: 0, total: 0, report: null, ...j }} busy={false} blocked={false}
  summary={false} onRun={() => {}} onCancel={cancel ? () => {} : undefined} onScrap={() => {}} />);

test('running can be cancelled; scrap is offered only while nobody has worked on it, and says why not (TL-544)', () => {
  expect(status({ state: 'running', progress: 3, total: 9 })).toContain('>Cancel<');
  expect(status({ state: 'running' }, false)).not.toContain('>Cancel<');
  const report = { created: { projects: 1, boards: 1, columns: 3, tickets: 9, comments: 2, attachments: 4 }, skipped: [{ kind: 'attachment', source_id: 'attachment:9', reason: 'larger than 16 MB: linked in its description' }] };
  const open = status({ report, scrappable: true });
  for (const s of ['Made 9 tickets', 'Copied 4 files.', 'Scrap this import', '1 rows or values left out', 'larger than 16 MB']) expect(open.replace(/<!-- -->/g, '')).toContain(s);
  const closed = status({ report, scrappable: false });
  expect(closed).not.toContain('Scrap this import');
  expect(closed).toContain('It can’t be scrapped any more');
  expect(status({ state: 'cancelled' })).toContain('Cancelled: nothing was imported.');
  expect(status({ state: 'previewing', planned: { projects: 1, boards: 1, columns: 1, tickets: 1, comments: 0 }, projects: [shop] })).not.toContain('This makes the project'); // the Jira preview says it
});

test('one Import card opens a page with CSV and Jira tabs, behind the imports flag, for admins (TL-653, source)', async () => {
  const read = (p: string) => Bun.file(new URL(p, import.meta.url)).text();
  const page = await read('../../components/settings/import-page.tsx');
  for (const s of ["is('imports').enabled()", '<TabsTrigger value="csv">', '<TabsTrigger value="jira">', '<CSVImport />', '<JiraImport />']) expect(page).toContain(s);
  expect(await read('../../app/settings/import/page.tsx')).toContain('<ImportSettings initial="csv" />');
  expect(await read('../../app/settings/import/jira/page.tsx')).toContain('<ImportSettings initial="jira" />');
  const settings = await read('../../app/settings/page.tsx');
  expect(settings).toContain("{admin && is('imports').enabled() && <SettingsCard icon={UploadIcon} title={t`Import`} href=\"/settings/import\"");
  expect(settings.match(/<SettingsCard icon=\{UploadIcon\}/g)?.length).toBe(1);
});

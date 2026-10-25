import { afterEach, expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { csvFile, guessMapping, headerOf, prefixFor } from './csv-import';
import { exportCSV, importsApi, type ImportJob } from './api';
import { ImportStatus } from '@/components/settings/csv-import';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('the header row: quotes, escaped quotes and a byte-order mark (TL-638)', () => {
  expect(headerOf('﻿Summary,"Notes, long","Say ""hi""",Status\nrow,1,2,3')).toEqual(['Summary', 'Notes, long', 'Say "hi"', 'Status']);
  expect(headerOf('Title\r\nx')).toEqual(['Title']);
});

test('columns are guessed from other tools\' names and our own export, each used once', () => {
  expect(guessMapping(['Summary', 'Issue Type', 'Priority', 'Labels', 'Status', 'Due date', 'Created'])).toEqual({
    title: 'Summary', type: 'Issue Type', priority: 'Priority', labels: 'Labels', status: 'Status', due: 'Due date', created: 'Created',
  });
  // our export: Column is the board column (status), State isn't needed when Column is there
  const ours = guessMapping(['Key', 'Title', 'Description', 'Type', 'Priority', 'Estimate', 'Labels', 'Board', 'Column', 'State', 'Assignee', 'Parent', 'Created', 'Done', 'Due']);
  expect(ours.status).toBe('Column');
  expect(ours.title).toBe('Title');
  expect(ours.due).toBe('Due');
  expect(guessMapping(['Name', 'Card Description', 'List'])).toEqual({ title: 'Name', description: 'Card Description', status: 'List' }); // Trello
});

test('a key prefix from the project name, as the backend takes it', () => {
  expect(prefixFor('Shop front')).toBe('SF');
  expect(prefixFor('ops')).toBe('OPS');
  expect(prefixFor('trello export 2026')).toBe('TE2');
  expect(prefixFor('a')).toBe('');
  expect(prefixFor('2026 plans')).toBe(''); // "2P" can't start with a digit, "P" is too short: left for the person
  expect(csvFile('Shop Front!')).toBe('shop-front-tickets.csv');
});

test('the import and export calls (TL-637 contract)', async () => {
  const asked: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    asked.push(`${init?.method ?? 'GET'} ${String(url).replace(/^.*\/api/, '')}${init?.body ? ` ${init.body}` : ''}`);
    return new Response(String(url).endsWith('.csv') ? 'Key,Title\n' : '{}', { headers: { 'Content-Type': String(url).endsWith('.csv') ? 'text/csv' : 'application/json' } });
  }) as typeof fetch;
  await importsApi.previewCSV({ csv: 'Title\nx', name: 'Ops', prefix: 'OPS', mapping: { title: 'Title' } }, 't');
  await importsApi.run('i1', 't');
  await importsApi.scrap('i1', 't');
  expect(await exportCSV('p1', 't')).toBe('Key,Title\n'); // as sent: the file's own last newline
  expect(asked).toEqual([
    'POST /imports {"source":"csv","options":{"csv":"Title\\nx","name":"Ops","prefix":"OPS","mapping":{"title":"Title"}}}',
    'POST /imports/i1/run', 'POST /imports/i1/scrap', 'GET /projects/p1/export.csv',
  ]);
});

const job = (o: Partial<ImportJob>): ImportJob => ({ id: 'i1', source: 'csv', state: 'previewing', progress: 0, total: 0, report: null, ...o });
const status = (j: ImportJob) => render(<ImportStatus job={j} busy={false} blocked={(j.problems?.length ?? 0) > 0} onRun={() => {}} onScrap={() => {}} />);

test('the preview says what it makes; problems block the import; skips are listed', () => {
  const html = status(job({ planned: { projects: 1, boards: 1, columns: 3, tickets: 42, comments: 0 }, projects: [{ name: 'Ops', prefix: 'OPS', tickets: 42 }], skipped: [{ kind: 'type', source_id: 'row 4', reason: 'type "weird" isn’t one TrackLin.es has: imported as a task' }] }));
  for (const s of ['<strong>Ops</strong>', '42 tickets', '1 rows or values left out', 'row 4', '>Import<']) expect(html).toContain(s);
  const blocked = status(job({ problems: [{ code: 'prefix_taken', message: 'the prefix OPS is already used' }] }));
  expect(blocked).toContain('Fix these first:');
  expect(blocked).toMatch(/<button[^>]*disabled[^>]*>Import</);
});

test('running shows progress; done offers scrap; failed says why', () => {
  expect(status(job({ state: 'running', progress: 10, total: 40 }))).toContain('10 of 40 tickets');
  const done = status(job({ state: 'done', report: { created: { projects: 1, boards: 1, columns: 3, tickets: 40, comments: 0 }, skipped: [] } }));
  expect(done).toContain('Made 40 tickets');
  expect(done).toContain('Scrap this import');
  expect(status(job({ state: 'failed', error: 'the prefix OPS is already used' }))).toContain('nothing was kept: the prefix OPS is already used');
});

test('the import page and card are behind the imports flag, for admins; export is on the project page (source)', async () => {
  const read = (p: string) => Bun.file(new URL(p, import.meta.url)).text();
  expect(await read('../app/settings/import/page.tsx')).toContain("is('imports').enabled()");
  expect(await read('../app/settings/page.tsx')).toContain("{admin && is('imports').enabled() && <SettingsCard icon={UploadIcon}");
  expect(await read('../app/projects/[id]/page.tsx')).toContain('<ExportCSVButton projectId={project.id} name={project.name} token={token} />');
});

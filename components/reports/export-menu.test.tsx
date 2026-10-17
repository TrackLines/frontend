import { afterEach, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExportMenu, markdownFile, PrintCover } from './export-menu';
import { reports } from '@/lib/api';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('Markdown comes from the server, for the report’s scope and period, as text (TL-401)', async () => {
  const asked: string[] = [];
  globalThis.fetch = (async (url: string) => {
    asked.push(String(url));
    return new Response('# Sprint report: Backend', { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
  }) as typeof fetch;
  const range = { from: '2026-08-01', to: '2026-09-30' };
  expect(await reports.markdown({ kind: 'board', id: 'b1' }, range, 'tok')).toBe('# Sprint report: Backend');
  await reports.markdown({ kind: 'project', id: 'p1' }, range, 'tok');
  await reports.markdown({ kind: 'org' }, range, 'tok');
  expect(asked.map((u) => u.replace(/^.*\/api/, ''))).toEqual([
    '/boards/b1/reports/sprints?from=2026-08-01&to=2026-09-30&format=md',
    '/projects/p1/reports/sprints?from=2026-08-01&to=2026-09-30&format=md',
    '/org/reports/sprints?from=2026-08-01&to=2026-09-30&format=md',
  ]);
});

test('the download is named as the server names it', () => {
  expect(markdownFile('Back|end <b>', { from: '2026-08-01', to: '2026-09-30' })).toBe('back-end-b-sprints-2026-08-01-to-2026-09-30.md'); // backend: TestSendMarkdown
  expect(markdownFile('!!!', { from: '2026-08-01', to: '2026-09-30' })).toBe('report-sprints-2026-08-01-to-2026-09-30.md');
});

test('the PDF: a cover only in print, the controls and site chrome left out', async () => {
  const cover = renderToStaticMarkup(<PrintCover title="Backend" kind="board" range={{ from: '2026-08-01', to: '2026-09-30' }} generated={new Date(2026, 9, 17, 9, 30)} />);
  expect(cover).toContain('hidden'); // not on screen
  expect(cover).toContain('print:flex');
  expect(cover).toContain('break-after-page');
  for (const s of ['alt="TrackLin.es"', 'Sprint report · board', '>Backend<', '2026-08-01 to 2026-09-30', 'Generated']) expect(cover).toContain(s);
  expect(renderToStaticMarkup(<ExportMenu scope={{ kind: 'board', id: 'b1' }} range={{ from: '2026-08-01', to: '2026-09-30' }} name="Backend" token="t" />)).toContain('print:hidden');
  const read = (p: string) => Bun.file(new URL(p, import.meta.url)).text();
  expect(await read('../../app/layout.tsx')).toContain('py-4 print:hidden'); // the site header
  expect(await read('../site-footer.tsx')).toContain('print:hidden');
  const css = await read('../../app/globals.css');
  expect(css).toContain('@page report');
  expect(css).toContain('size: landscape');
  // each chart on its own page
  expect(await read('./report-view.tsx')).toContain('print:break-after-page" aria-label={title}');
});

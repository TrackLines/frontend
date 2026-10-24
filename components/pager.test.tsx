import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { Pager } from './pager';

const pager = (page: number, lastPage: number) => renderToStaticMarkup(<Pager page={page} lastPage={lastPage} onPage={() => {}} anchor="#list" />);

test('one page: no pager', () => {
  expect(pager(1, 1)).toBe('');
});

test('pages, the current one marked, ends disabled', () => {
  const html = pager(1, 3);
  expect(html).toContain('aria-current="page"');
  expect(html).toContain('href="#list"');
  expect(html).toMatch(/aria-disabled="true"[^>]*aria-label="Go to previous page"|aria-label="Go to previous page"[^>]*aria-disabled="true"/);
  expect(pager(3, 3)).toMatch(/aria-disabled="true"[^>]*aria-label="Go to next page"|aria-label="Go to next page"[^>]*aria-disabled="true"/);
  expect(pager(5, 20)).toContain('More pages'); // the gap
});

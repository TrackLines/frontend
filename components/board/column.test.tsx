import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { Column } from './column';

const ticket = (id: string) => ({ id, column_id: 'c', title: id, description: '', position: 0, created_by: 'u' });
const col = (n: number, wip_limit: number | null) => ({ id: 'c', name: 'Doing', position: 1, wip_limit, tickets: Array.from({ length: n }, (_, i) => ticket(`t${i}`)) });

test('column shows its count against the WIP limit', () => {
  const html = renderToStaticMarkup(<Column column={col(2, 3)} />);
  expect(html).toContain('2 / 3');
  expect(html).not.toContain('Over the limit');
});

test('over the limit is flagged', () => {
  const html = renderToStaticMarkup(<Column column={col(4, 3)} />);
  expect(html).toContain('Over the limit of 3');
  expect(html).toContain('ring-destructive');
});

test('no limit: just the count; the board has no WIP field (that is on the edit page, TL-470)', () => {
  const html = renderToStaticMarkup(<Column column={col(1, null)} />);
  expect(html).not.toContain('WIP limit');
  expect(html).not.toContain(' / ');
});

test('on an estimated board the header shows points: left to do, or completed in Done', () => {
  const sized = { ...col(3, null), tickets: [{ ...ticket('a'), estimate: '5' }, { ...ticket('b'), estimate: '3' }, ticket('c')] };
  expect(renderToStaticMarkup(<Column column={sized} scale="fibonacci" />)).toContain('8 pts left');
  expect(renderToStaticMarkup(<Column column={sized} scale="fibonacci" done />)).toContain('8 pts done');
  expect(renderToStaticMarkup(<Column column={sized} />)).not.toContain('pts'); // no scale: count only
  const shirts = { ...col(2, null), tickets: [{ ...ticket('a'), estimate: 'M' }, { ...ticket('b'), estimate: 'XS' }] };
  expect(renderToStaticMarkup(<Column column={shirts} scale="tshirt" />)).toContain('4 pts left'); // M=3 + XS=1
});

test('WIP limits are only for work in progress: not the first column (waiting) or the last (Done)', async () => {
  const page = await Bun.file(new URL('../../app/boards/[id]/page.tsx', import.meta.url)).text();
  expect(page).toContain('limited={!done && col.id !== cols[0]?.id}');
  // and a limit saved there before is ignored: no "/ 3", no warning
  const html = renderToStaticMarkup(<Column column={col(4, 3)} limited={false} />);
  expect(html).not.toContain('/ 3');
  expect(html).not.toContain('Over the limit');
  expect(html).not.toContain('ring-2 ring-destructive/50'); // the over-limit outline
});

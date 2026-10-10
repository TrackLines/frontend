import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Column } from './column';

const ticket = (id: string) => ({ id, column_id: 'c', title: id, description: '', position: 0, created_by: 'u' });
const col = (n: number, wip_limit: number | null) => ({ id: 'c', name: 'Doing', position: 1, wip_limit, tickets: Array.from({ length: n }, (_, i) => ticket(`t${i}`)) });

test('column shows its count against the WIP limit', () => {
  const html = renderToStaticMarkup(<Column column={col(2, 3)} token="x" />);
  expect(html).toContain('2 / 3');
  expect(html).not.toContain('Over the limit');
});

test('over the limit is flagged', () => {
  const html = renderToStaticMarkup(<Column column={col(4, 3)} token="x" />);
  expect(html).toContain('Over the limit of 3');
  expect(html).toContain('ring-destructive');
});

test('no limit: just the count, and the WIP field only in edit mode', () => {
  expect(renderToStaticMarkup(<Column column={col(1, null)} token="x" />)).not.toContain('WIP limit');
  expect(renderToStaticMarkup(<Column column={col(1, null)} token="x" editMode />)).toContain('WIP limit');
});

test('on an estimated board the header shows points: left to do, or completed in Done', () => {
  const sized = { ...col(3, null), tickets: [{ ...ticket('a'), estimate: '5' }, { ...ticket('b'), estimate: '3' }, ticket('c')] };
  expect(renderToStaticMarkup(<Column column={sized} token="x" scale="fibonacci" />)).toContain('8 pts left');
  expect(renderToStaticMarkup(<Column column={sized} token="x" scale="fibonacci" done />)).toContain('8 pts done');
  expect(renderToStaticMarkup(<Column column={sized} token="x" />)).not.toContain('pts'); // no scale: count only
  const shirts = { ...col(2, null), tickets: [{ ...ticket('a'), estimate: 'M' }, { ...ticket('b'), estimate: 'XS' }] };
  expect(renderToStaticMarkup(<Column column={shirts} token="x" scale="tshirt" />)).toContain('4 pts left'); // M=3 + XS=1
});

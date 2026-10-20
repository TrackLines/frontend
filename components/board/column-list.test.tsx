import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ColumnList } from './column-list';
import { draftOf } from '@/lib/board-edit';
import type { Board } from '@/lib/api';

const board = {
  id: 'b', project_id: 'p', owner_clerk_id: 'o', name: 'Web', description: '', created_at: '', updated_at: '',
  columns: [
    { id: 'todo', name: 'To do', position: 0, tickets: [], wip_limit: null },
    { id: 'doing', name: 'Doing', position: 1, tickets: [{}], wip_limit: 3 },
    { id: 'review', name: 'Review', position: 2, tickets: [], wip_limit: null },
    { id: 'done', name: 'Done', position: 3, tickets: [], wip_limit: null },
  ],
} as unknown as Board;

test('the edit page lists columns in order: To do and Done pinned, the middle ones sortable with WIP limits (TL-470)', () => {
  const html = renderToStaticMarkup(<ColumnList draft={draftOf(board)} onChange={() => {}} />);
  const order = ['To do', 'Doing', 'Review', 'Done'].map((n) => html.indexOf(`Column name: ${n}`));
  expect(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1]))).toBe(true);
  expect(html).toContain('first: new tickets start here');
  expect(html).toContain('last: a ticket here is done');
  // only the middle two drag, take a WIP limit and can be removed
  expect(html.match(/Drag [^"]+ to reorder/g)).toEqual(['Drag Doing to reorder', 'Drag Review to reorder']);
  expect(html.match(/WIP limit/g)).toHaveLength(2);
  expect(html).toContain('value="3"');
  // Doing has a ticket: it can't be removed until it's moved; Review can
  expect(html).toMatch(/aria-label="Remove Doing"[^>]*disabled=""|disabled=""[^>]*aria-label="Remove Doing"/);
  expect(html).not.toMatch(/aria-label="Remove Review"[^>]*disabled=""|disabled=""[^>]*aria-label="Remove Review"/);
  expect(html).toContain('New columns go before Done.');
});

test('Edit board opens its own page; the board has no edit mode (TL-470)', async () => {
  const page = await Bun.file(new URL('../../app/boards/[id]/page.tsx', import.meta.url)).text();
  expect(page).toContain('href={`/boards/${board.id}/edit`}');
  expect(page).not.toContain('editMode');
  expect(page).not.toContain('Done editing');
});

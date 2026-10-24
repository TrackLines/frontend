import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import type { Board } from '@/lib/api';
import { ArchivedBanner, lifecycleAction } from './board-lifecycle';
import { ArchivedBoardsView } from '@/components/project/archived-boards';

const board = (over: Partial<Board>): Board => ({
  id: 'b', project_id: 'p', owner_clerk_id: 'o', name: 'Web', description: '', created_at: '', updated_at: '', ...over,
});

test('never used → admins delete; used → managers archive; archived → managers restore', () => {
  expect(lifecycleAction({ deletable: true }, true, true)).toBe('delete');
  expect(lifecycleAction({ deletable: true }, false, true)).toBeNull(); // deleting is for admins
  expect(lifecycleAction({ deletable: false }, false, true)).toBe('archive');
  expect(lifecycleAction({ deletable: false }, true, false)).toBeNull();
  expect(lifecycleAction({ archived_at: '2026-10-12T10:00:00Z' }, true, true)).toBe('restore');
  expect(lifecycleAction({ archived_at: '2026-10-12T10:00:00Z' }, false, false)).toBeNull();
});

test('an archived board says so; managers can restore it', () => {
  const html = (canManage: boolean, archived_at: string | null) =>
    renderToStaticMarkup(<ArchivedBanner board={board({ archived_at })} canManage={canManage} token="x" onRestored={() => {}} />);
  expect(html(true, '2026-10-12T10:00:00Z')).toContain('This board is archived');
  expect(html(true, '2026-10-12T10:00:00Z')).toContain('Restore board');
  expect(html(false, '2026-10-12T10:00:00Z')).not.toContain('Restore board');
  expect(html(true, null)).toBe('');
});

test('archived boards list: name links to the board, when, Restore; empty state', () => {
  const html = renderToStaticMarkup(<ArchivedBoardsView list={[board({ archived_at: '2026-10-12T10:00:00Z' })]} error="" busy={null} onRestore={() => {}} />);
  for (const s of ['href="/boards/b"', '>Web<', 'Archived', 'Restore']) expect(html).toContain(s);
  expect(renderToStaticMarkup(<ArchivedBoardsView list={[]} error="" busy={null} onRestore={() => {}} />)).toContain('No archived boards');
});

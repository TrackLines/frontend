import { expect, test } from 'bun:test';
import type { Board } from '../api';
import { i18nFor } from '../i18n';
import { addColumn, changeColumn, devComplete, devCompleteOptions, pickReview, reviewColumn, reviewKey, dirty, draftOf, layout, layoutChanged, moveColumn, problem, removeColumn, settingsPatch } from './board-edit';

const board = {
  id: 'b', project_id: 'p', owner_clerk_id: 'o', name: 'Web', description: '', created_at: '', updated_at: '', style: 'kanban', estimate_scale: 'none',
  columns: [
    { id: 'todo', name: 'To do', position: 0, tickets: [{}, {}], wip_limit: null },
    { id: 'doing', name: 'Doing', position: 1, tickets: [{}], wip_limit: 3 },
    { id: 'review', name: 'Review', position: 2, tickets: [], wip_limit: null },
    { id: 'done', name: 'Done', position: 3, tickets: [{}], wip_limit: null },
  ],
} as unknown as Board;
const names = (d: ReturnType<typeof draftOf>) => d.columns.map((c) => c.name);

test('a new column goes before Done; To do and Done stay at the ends (TL-470)', () => {
  const d = addColumn(draftOf(board), '  QA ', 'new1');
  expect(names(d)).toEqual(['To do', 'Doing', 'Review', 'QA', 'Done']);
  // only the middle moves, and only within it
  expect(names(moveColumn(d, 'new1', 0))).toEqual(['To do', 'QA', 'Doing', 'Review', 'Done']);
  expect(names(moveColumn(d, 'new1', 99))).toEqual(names(d));
  expect(names(moveColumn(d, 'todo', 2))).toEqual(names(d));
  expect(names(moveColumn(d, 'done', 1))).toEqual(names(d));
});

test('only empty middle columns can be removed', () => {
  const d = draftOf(board);
  expect(names(removeColumn(d, 'review'))).toEqual(['To do', 'Doing', 'Done']);
  expect(names(removeColumn(d, 'doing'))).toEqual(names(d)); // has a ticket
  expect(names(removeColumn(d, 'todo'))).toEqual(names(d));
  expect(names(removeColumn(d, 'done'))).toEqual(names(d));
});

test('save sends only what changed: settings, and the layout with WIP limits only between the ends', () => {
  const was = draftOf(board);
  expect(dirty(was, was)).toBe(false);
  expect(settingsPatch(was, was)).toBeNull();
  let d: typeof was = { ...was, name: ' Web app ', scale: 'fibonacci' };
  expect(settingsPatch(d, was)).toEqual({ name: 'Web app', estimate_scale: 'fibonacci' });
  expect(layoutChanged(d, was)).toBe(false);
  d = addColumn(changeColumn(d, 'todo', { wip: 5 }), 'QA', 'new1');
  expect(layout(d)).toEqual([
    { id: 'todo', name: 'To do', wip_limit: null }, // ends take no limit
    { id: 'doing', name: 'Doing', wip_limit: 3 },
    { id: 'review', name: 'Review', wip_limit: null },
    { name: 'QA', wip_limit: null }, // new: no id
    { id: 'done', name: 'Done', wip_limit: null },
  ]);
  expect(layoutChanged(d, was)).toBe(true);
  expect(dirty(d, was)).toBe(true);
});

test('what stops a save is said plainly', () => {
  const d = draftOf(board);
  expect(problem(d, i18nFor('en'))).toBeNull();
  expect(problem({ ...d, name: ' ' }, i18nFor('en'))).toBe('The board needs a name.');
  expect(problem(changeColumn(d, 'doing', { name: '' }), i18nFor('en'))).toBe('Every column needs a name.');
  expect(problem(changeColumn(d, 'doing', { name: 'x'.repeat(81) }), i18nFor('en'))).toContain('up to 80');
  expect(problem(changeColumn(d, 'doing', { wip: 1000 }), i18nFor('en'))).toContain('from 1 to 999');
  expect(problem(changeColumn(d, 'doing', { wip: 0 }), i18nFor('en'))).toContain('from 1 to 999');
});

test('Dev complete (TL-532): only saved columns between To do and Done; a removed one turns it off', () => {
  const d = addColumn(draftOf({ ...board, dev_complete_column_id: 'review' } as Board), 'QA', 'new1');
  expect(d.devComplete).toBe('review');
  expect(devCompleteOptions(d).map((c) => c.id)).toEqual(['doing', 'review']);
  expect(settingsPatch(d, draftOf(board))).toEqual({ dev_complete_column_id: 'review' });
  expect(settingsPatch({ ...d, devComplete: 'todo' }, draftOf(board))).toBeNull(); // To do isn't an option
  const gone = removeColumn(d, 'review');
  expect(devComplete(gone)).toBe('');
  expect(settingsPatch(gone, d)).toEqual({ dev_complete_column_id: '' });
});

test('Review column (TL-593, TL-673): the robot marks the picked column, or the one before Done; only saved middle columns can be picked', () => {
  const d = draftOf({ ...board, agent_review: true, review_column_id: 'doing' } as Board);
  const empty = changeEmpty(d); // Doing without its ticket, so it can be removed
  expect(reviewKey(d)).toBe('doing');
  expect(reviewKey({ ...d, agentReview: false })).toBe(''); // only agents' work waits there
  expect(reviewKey({ ...d, reviewColumn: '' })).toBe('review'); // default: the column before Done
  expect(reviewKey(removeColumn(empty, 'doing'))).toBe('review'); // the picked one's gone: back to the default
  expect(reviewColumn(d)).toBe('doing');
  // picking: another middle column; the column before Done is the default (''); To do, Done and unsaved columns aren't
  const before = pickReview(d, 'review');
  expect(before.reviewColumn).toBe('');
  expect(settingsPatch(before, d)).toEqual({ review_column_id: '' });
  expect(pickReview(before, 'doing').reviewColumn).toBe('doing');
  expect(pickReview(d, 'todo')).toBe(d);
  expect(pickReview(d, 'done')).toBe(d);
  const added = addColumn(d, 'QA', 'new1');
  expect(pickReview(added, 'new1')).toBe(added);
  expect(settingsPatch({ ...d, reviewColumn: 'done' }, d)).toEqual({ review_column_id: '' }); // Done isn't an option
  // a board of three: its one middle column is the review column
  const three = removeColumn({ ...empty, reviewColumn: '' }, 'doing');
  expect(three.columns).toHaveLength(3);
  expect(reviewKey(three)).toBe('review');
  expect(settingsPatch(removeColumn(empty, 'doing'), d)).toEqual({ review_column_id: '' }); // the picked column removed
});

function changeEmpty(d: ReturnType<typeof draftOf>) {
  return { ...d, columns: d.columns.map((c) => (c.id === 'doing' ? { ...c, tickets: 0 } : c)) };
}

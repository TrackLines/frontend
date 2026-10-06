import { expect, test } from 'bun:test';
import { assigneeItems } from './assignee-select';

const list = [{ id: 'user_1', label: 'You' }, { id: 'codex', label: 'codex' }];

test('choices: unassigned, you, agents', () => {
  expect(assigneeItems(list, null)).toEqual({ __unassigned: 'Unassigned', user_1: 'You', codex: 'codex' });
});

test('keeps a current assignee that is no longer a choice', () => {
  expect(assigneeItems(list, 'hermes').hermes).toBe('hermes');
  expect(assigneeItems(list, 'legacy').legacy).toBe('Imported');
  expect(Object.keys(assigneeItems(list, 'codex'))).toHaveLength(3);
});

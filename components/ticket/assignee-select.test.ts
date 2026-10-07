import { expect, test } from 'bun:test';
import { assigneeItems } from './assignee-select';

const list = [
  { id: 'user_1', label: 'You', kind: 'person' as const },
  { id: 'codex', label: 'codex', kind: 'ai' as const },
  { id: 'deploy', label: 'Deploy', kind: 'service' as const },
];

test('choices: unassigned, people and explicitly labelled AI keys, never service keys', () => {
  expect(assigneeItems(list, null)).toEqual({ __unassigned: 'Unassigned', user_1: 'You', codex: 'codex (AI)' });
});

test('keeps a current assignee that is no longer a choice', () => {
  expect(assigneeItems(list, 'hermes').hermes).toBe('hermes');
  expect(assigneeItems(list, 'legacy').legacy).toBe('Imported');
  expect(Object.keys(assigneeItems(list, 'codex'))).toHaveLength(3);
});

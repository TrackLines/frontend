import { expect, test } from 'bun:test';
import { i18nFor } from '@/lib/i18n';
import { assigneeItems } from './assignee-select';

const list = [
  { id: 'user_1', label: 'You', kind: 'person' as const },
  { id: 'codex', label: 'codex', kind: 'ai' as const },
  { id: 'deploy', label: 'Deploy', kind: 'service' as const },
];

test('choices: unassigned, people and explicitly labelled AI keys, never service keys', () => {
  expect(assigneeItems(i18nFor('en'), list, null)).toEqual({ __unassigned: 'Unassigned', user_1: 'You', codex: 'codex · AI' });
});

test('keeps a current assignee that is no longer a choice', () => {
  expect(assigneeItems(i18nFor('en'), list, 'hermes').hermes).toBe('hermes');
  expect(assigneeItems(i18nFor('en'), list, 'legacy').legacy).toBe('Imported');
  expect(Object.keys(assigneeItems(i18nFor('en'), list, 'codex'))).toHaveLength(3);
});

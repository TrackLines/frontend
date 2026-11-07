import { expect, test } from 'bun:test';
const { i18nFor } = await import('@/lib/i18n');
const { DEFAULT_PRIORITIES, priorityName } = await import('./priorities');

test('levels run most urgent first; a level the web doesn\'t know yet shows its API name (TL-847)', () => {
  expect(DEFAULT_PRIORITIES.map((p) => p.key)).toEqual(['urgent', 'high', 'medium', 'low']);
  expect(priorityName(i18nFor('en'), { key: 'high', name: 'ignored' })).toBe('High');
  expect(priorityName(i18nFor('de'), { key: 'urgent', name: 'Urgent' })).not.toBe(''); // translated
  expect(priorityName(i18nFor('en'), { key: 'semi-urgent', name: 'Semi-urgent' })).toBe('Semi-urgent');
});

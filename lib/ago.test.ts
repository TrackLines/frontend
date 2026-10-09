import { expect, test } from 'bun:test';
import { ago } from './ago';

test('ago picks the largest unit', () => {
  const now = Date.parse('2026-10-09T12:00:00Z');
  expect(ago('2026-10-09T11:59:30Z', now)).toBe('just now');
  expect(ago('2026-10-09T09:00:00Z', now)).toBe('3 hours ago');
  expect(ago('2026-10-08T12:00:00Z', now)).toBe('yesterday');
  expect(ago('2026-08-01T12:00:00Z', now)).toBe('2 months ago');
});

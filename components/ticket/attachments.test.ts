import { expect, test } from 'bun:test';
import { formatSize } from './attachments';

test('file sizes read naturally', () => {
  expect(formatSize(512)).toBe('512 B');
  expect(formatSize(2048)).toBe('2.0 KB');
  expect(formatSize(5 * 1024 * 1024)).toBe('5.0 MB');
});

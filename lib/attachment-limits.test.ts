import { expect, test } from 'bun:test';
import { attachProblem, MAX_FILE_BYTES, MAX_FILES_PER_TICKET } from './attachment-limits';

const f = (size = 1000, name = 'a.png') => ({ name, size });

test('up to 10 MB a file and 10 a ticket; a notice only when someone goes over (TL-253)', () => {
  expect(attachProblem(0, [f(MAX_FILE_BYTES)])).toBeNull(); // exactly 10 MB is fine
  expect(attachProblem(0, [f(), f(MAX_FILE_BYTES + 1, 'big.zip')])).toBe('“big.zip” is too big: files can be up to 10 MB.');
  expect(attachProblem(MAX_FILES_PER_TICKET - 1, [f()])).toBeNull(); // the tenth
  expect(attachProblem(MAX_FILES_PER_TICKET, [f()])).toContain('Remove one to add another');
  expect(attachProblem(8, [f(), f(), f()])).toBe('A ticket can hold 10 files, so only 2 more can be added here.');
});

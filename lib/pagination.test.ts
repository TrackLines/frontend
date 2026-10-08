import { expect, test } from 'bun:test';
import { pageItems } from './pagination';

test('page buttons collapse long runs', () => {
  expect(pageItems(1, 1)).toEqual([1]);
  expect(pageItems(1, 3)).toEqual([1, 2, 3]);
  expect(pageItems(1, 10)).toEqual([1, 2, 'gap', 10]);
  expect(pageItems(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10]);
  expect(pageItems(3, 10)).toEqual([1, 2, 3, 4, 'gap', 10]); // lone skipped page shown, not a gap
  expect(pageItems(10, 10)).toEqual([1, 'gap', 9, 10]);
});

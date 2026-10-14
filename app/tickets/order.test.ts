import { expect, test } from 'bun:test';

// the duplicate action sits with the dependencies, below the description, not under the title (TL-258)
test('Mark as duplicate comes right after Dependencies on the ticket page', async () => {
  const src = await Bun.file(new URL('./[id]/page.tsx', import.meta.url)).text();
  const deps = src.indexOf('<Dependencies '), dup = src.indexOf('<MarkDuplicate '), title = src.indexOf('<h1');
  expect(dup).toBeGreaterThan(deps);
  expect(dup).toBeGreaterThan(title);
  expect(src.slice(deps, dup).split('\n').length).toBeLessThanOrEqual(2); // the very next thing
});

import { expect, test } from 'bun:test';
import { refresher } from './use-auto-refresh';

test('auto refresh runs one at a time and never while the tab is hidden', async () => {
  let hidden = false;
  let calls = 0;
  let finish = () => {};
  const run = refresher(() => { calls++; return new Promise<void>((r) => { finish = r; }); }, () => hidden);
  run();
  run(); // still running: skipped
  expect(calls).toBe(1);
  finish();
  await new Promise((r) => setTimeout(r, 0));
  hidden = true;
  run();
  expect(calls).toBe(1);
  hidden = false;
  run();
  expect(calls).toBe(2);
});

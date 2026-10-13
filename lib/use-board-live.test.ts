import { expect, test } from 'bun:test';
import { keepStreaming } from './use-board-live';

test('the live stream reconnects with a doubling wait (max 10s), reset after a connection works', async () => {
  const controller = new AbortController();
  const outcomes = ['fail', 'fail', 'ok', 'fail', ...Array(8).fill('fail')];
  const waits: number[] = [];
  let drops = 0;
  await keepStreaming(async () => { if (outcomes.shift() !== 'ok') throw new Error('dropped'); }, controller.signal, () => drops++,
    async (ms) => { waits.push(ms); if (waits.length === 10) controller.abort(); });
  expect(waits).toEqual([500, 1000, 500, 1000, 2000, 4000, 8000, 10000, 10000, 10000]);
  expect(drops).toBe(10);
});

test('closing the board stops reconnecting', async () => {
  const controller = new AbortController();
  let connects = 0;
  await keepStreaming(async () => { connects++; controller.abort(); throw new Error('aborted'); }, controller.signal, () => {}, async () => {});
  expect(connects).toBe(1);
});

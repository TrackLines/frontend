import { expect, test } from 'bun:test';
import { unchanged } from './unchanged';

test('an identical refresh keeps what is on screen, so React redraws nothing (TL-232)', () => {
  const onScreen = { id: 'b1', columns: [{ id: 'c1', tickets: [{ id: 't1', title: 'Fix login' }] }] };
  const refreshed = JSON.parse(JSON.stringify(onScreen)); // same data, new objects from the API
  expect(unchanged(onScreen, refreshed)).toBe(onScreen);
});

test('a real change, or nothing on screen yet, takes the new data', () => {
  const onScreen = { id: 'b1', columns: [{ id: 'c1', tickets: [{ id: 't1', title: 'Fix login' }] }] };
  const moved = { id: 'b1', columns: [{ id: 'c1', tickets: [{ id: 't1', title: 'Fix login now' }] }] };
  expect(unchanged(onScreen, moved)).toBe(moved);
  expect(unchanged(null, moved)).toBe(moved);
  expect(unchanged(undefined, moved)).toBe(moved);
});

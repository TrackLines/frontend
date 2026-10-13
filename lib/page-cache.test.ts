import { expect, test } from 'bun:test';
import { forgetAllCached, switched } from './page-cache';

test('cached pages go when the person or org changes, not on first load or a re-render', () => {
  expect(switched(undefined, 'user_a')).toBe(false); // first load
  expect(switched('user_a', 'user_a')).toBe(false);
  expect(switched('user_a', 'user_b')).toBe(true);
  expect(switched('user_a', null)).toBe(true); // signed out
  expect(switched(null, 'user_b')).toBe(true); // the next person signs in
  expect(switched('org_a', undefined)).toBe(true);
  expect(typeof forgetAllCached).toBe('function');
});

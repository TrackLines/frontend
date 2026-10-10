import { expect, test } from 'bun:test';
import type { Ticket } from './api';
import { clock, goTo, participants, pause, remaining, resume, REVIEW_MS, reviewing, speaker, start, TURN_MS } from './standup';

const ticket = (assigned_to: string | null) => ({ id: 't', column_id: 'c', title: '', description: '', position: 0, created_by: 'x', assigned_to }) as Ticket;

test('participants: team members plus anyone with tickets, by name, once each', () => {
  const names = new Map([['user_a', 'Ava'], ['user_b', 'Ben'], ['claude', 'claude']]);
  const got = participants(['user_b', 'user_a'], [ticket('claude'), ticket('user_a'), ticket(null)], names);
  expect(got).toEqual([{ id: 'user_a', label: 'Ava' }, { id: 'user_b', label: 'Ben' }, { id: 'claude', label: 'claude' }]);
  expect(participants([], [ticket('codex')], new Map())).toEqual([{ id: 'codex', label: 'codex' }]); // unknown name: the id
});

test('turns run 2 minutes each, then a 5 minute clean board', () => {
  const people = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
  let s = start(people, 0);
  expect(speaker(s)?.id).toBe('a');
  expect(remaining(s, 30_000)).toBe(TURN_MS - 30_000);
  s = goTo(s, s.index + 1, 60_000); // next: fresh clock
  expect(speaker(s)?.id).toBe('b');
  expect(remaining(s, 60_000)).toBe(TURN_MS);
  s = goTo(s, s.index + 1, 90_000);
  expect(reviewing(s) && speaker(s) === null).toBe(true);
  expect(remaining(s, 90_000)).toBe(REVIEW_MS);
  expect(goTo(s, 99, 0).index).toBe(2); // can't go past the review
  expect(goTo(s, -1, 0).index).toBe(0);
});

test('pause stops the clock; running over goes negative', () => {
  let s = start([{ id: 'a', label: 'A' }], 0);
  s = pause(s, 10_000);
  expect(remaining(s, 50_000)).toBe(TURN_MS - 10_000);
  s = resume(s, 50_000);
  expect(remaining(s, 60_000)).toBe(TURN_MS - 20_000);
  expect(remaining(s, 50_000 + TURN_MS)).toBe(-10_000);
});

test('clock', () => {
  expect(clock(TURN_MS)).toBe('2:00');
  expect(clock(61_500)).toBe('1:02');
  expect(clock(-20_000)).toBe('over by 0:20');
});

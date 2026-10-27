import { expect, test } from 'bun:test';
import { matchPeople, mentionAt, mentionPeople, mentionText } from './mentions';

const people = mentionPeople([
  { id: 'u1', label: 'Alan Smith', kind: 'person', name: 'Alan Smith', username: 'bob' },
  { id: 'u2', label: 'You', kind: 'person', name: 'Bob Jones', username: 'jonesey' },
  { id: 'u3', label: 'Simon', kind: 'person', name: 'Simon' },
  { id: 'u4', label: 'Tim', kind: 'person', name: 'Tim' },
  { id: 'u5', label: 'Alex', kind: 'person', name: 'Alex' },
  { id: 'codex', label: 'codex', kind: 'ai' },
]);
const names = (q: string) => matchPeople(people, q).map((p) => p.name);

test('people only, by real name (also for You)', () => {
  expect(people.map((p) => p.name)).toEqual(['Alan Smith', 'Bob Jones', 'Simon', 'Tim', 'Alex']);
});

test('@ lists everyone; typing narrows by username or real name', () => {
  expect(names('')).toEqual(['Alan Smith', 'Bob Jones', 'Simon', 'Tim', 'Alex']);
  expect(names('b')).toEqual(['Alan Smith', 'Bob Jones']); // bob (username), Bob Jones (name)
  expect(names('JON')).toEqual(['Bob Jones']); // surname and username, case-insensitive
  expect(names('al')).toEqual(['Alan Smith', 'Alex']);
  expect(names('zz')).toEqual([]);
});

test('the @word at the caret', () => {
  expect(mentionAt('@', 1)).toEqual({ start: 0, query: '' });
  expect(mentionAt('hi @bo', 6)).toEqual({ start: 3, query: 'bo' });
  expect(mentionAt('hi @bo there', 6)).toEqual({ start: 3, query: 'bo' });
  expect(mentionAt('line\n@b', 7)).toEqual({ start: 5, query: 'b' });
  expect(mentionAt('mail me@x.com', 13)).toBeNull(); // emails don't open it
  expect(mentionAt('@bob done', 9)).toBeNull(); // finished mention
});

test('choosing types @username, else @Real Name', () => {
  expect(mentionText(people[0])).toBe('@bob ');
  expect(mentionText(people[2])).toBe('@Simon ');
});

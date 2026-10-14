import { expect, test } from 'bun:test';
import { draggedPerson, personDragId } from './person-drag';

test('a face’s drag id says whose it is; ticket drags are not faces', () => {
  expect(draggedPerson(personDragId('user_ava'))).toBe('user_ava');
  expect(draggedPerson('6f1c0a52-0b7e-4c3f-9d55-1f2a3b4c5d6e')).toBeNull();
});

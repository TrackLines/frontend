import { expect, test } from 'bun:test';
import { personLabel } from './people';

test('people read naturally', () => {
  expect(personLabel('user_3KHx3OAKtUhUZu3lJ0VyM6725bk')).toBe('You');
  expect(personLabel('claude')).toBe('claude');
  expect(personLabel('legacy')).toBe('Imported');
  expect(personLabel(null)).toBe('Unassigned');
});

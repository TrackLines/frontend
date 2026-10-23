import { expect, test } from 'bun:test';
import { isLocale, pickLocale } from './locale';

test('the saved choice wins, then the first browser language we have, then English (TL-553)', () => {
  expect(pickLocale('nl', ['en-GB'])).toBe('nl');
  expect(pickLocale(null, ['fr-FR', 'nl-BE', 'en'])).toBe('nl');
  expect(pickLocale(undefined, ['NL'])).toBe('nl');
  expect(pickLocale('fr', ['de-DE'])).toBe('en');
  expect(pickLocale(null, [])).toBe('en');
});

test('only languages we translate into are locales', () => {
  expect(isLocale('en')).toBe(true);
  expect(isLocale('nl')).toBe(true);
  expect(isLocale('fr')).toBe(false);
  expect(isLocale(undefined)).toBe(false);
});

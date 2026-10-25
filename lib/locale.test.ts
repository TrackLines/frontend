import { expect, test } from 'bun:test';
import { isLocale, pickLocale } from './locale';

test('the saved choice wins, then the first browser language we have, then English (TL-553)', () => {
  expect(pickLocale('nl', ['en-GB'])).toBe('nl');
  expect(pickLocale(null, ['it-IT', 'nl-BE', 'en'])).toBe('nl');
  expect(pickLocale(undefined, ['NL'])).toBe('nl');
  expect(pickLocale('it', ['sv-SE'])).toBe('en');
  // TL-611: German, Spanish, Brazilian Portuguese, French
  expect(pickLocale(null, ['de-AT'])).toBe('de');
  expect(pickLocale(null, ['es-MX'])).toBe('es');
  expect(pickLocale(null, ['pt-BR'])).toBe('pt');
  expect(pickLocale(null, ['fr-CA'])).toBe('fr');
  expect(pickLocale('tlh', ['en'])).toBe('tlh'); // Klingon, for fun (TL-610)
  expect(pickLocale(null, ['tlh', 'en'])).toBe('tlh');
  expect(pickLocale(null, [])).toBe('en');
});

test('only languages we translate into are locales', () => {
  expect(isLocale('en')).toBe(true);
  expect(isLocale('nl')).toBe(true);
  expect(isLocale('fr')).toBe(true);
  expect(isLocale('it')).toBe(false);
  expect(isLocale(undefined)).toBe(false);
});

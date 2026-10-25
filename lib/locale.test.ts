import { expect, test } from 'bun:test';
import { isKonami, isLocale, KONAMI, konami, pickLocale } from './locale';
import { shownLocales } from '@/components/settings/language';

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
  // Klingon is chosen, never picked for you
  expect(pickLocale('tlh', ['en'])).toBe('tlh');
  expect(pickLocale(null, ['tlh', 'en'])).toBe('en');
  expect(pickLocale(null, [])).toBe('en');
});

test('only languages we translate into are locales', () => {
  expect(isLocale('en')).toBe(true);
  expect(isLocale('nl')).toBe(true);
  expect(isLocale('fr')).toBe(true);
  expect(isLocale('it')).toBe(false);
  expect(isLocale(undefined)).toBe(false);
});

test('the Konami code unlocks Klingon in the language setting (TL-610)', () => {
  const typed = (keys: string[]) => isKonami(keys.reduce(konami, [] as string[]));
  expect(typed(KONAMI)).toBe(true);
  expect(typed(['ArrowUp', 'x', ...KONAMI.slice(1)])).toBe(false); // a wrong key in the middle
  expect(typed(['ArrowUp', 'ArrowUp', ...KONAMI])).toBe(true); // stray keys first don't spoil it
  expect(typed([...KONAMI, 'x'])).toBe(false); // it has to be the last thing typed
  expect(shownLocales(false)).not.toContain('tlh');
  expect(shownLocales(false)).toEqual(['en', 'nl', 'de', 'es', 'pt', 'fr']);
  expect(shownLocales(true)).toContain('tlh');
});

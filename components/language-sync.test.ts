import { expect, test } from 'bun:test';
import { wantedLocale } from './language-sync';

test('the language follows the translations flag (TL-553)', () => {
  const on = { translations: { enabled: true } }, off = { translations: { enabled: false } }, other = { 'release-done': { enabled: true } };
  expect(wantedLocale({}, 'nl', ['nl'])).toBeNull(); // flags.gg hasn't answered: change nothing
  expect(wantedLocale(off, 'nl', ['nl-NL'])).toBe('en');
  expect(wantedLocale(other, null, ['nl-NL'])).toBe('en'); // no flag at all is off
  expect(wantedLocale(on, null, ['nl-NL', 'en'])).toBe('nl');
  expect(wantedLocale(on, 'en', ['nl-NL'])).toBe('en'); // the saved choice beats the browser
  expect(wantedLocale(on, null, ['fr-FR'])).toBe('en');
});

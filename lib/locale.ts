import { HIDDEN_LOCALES, LOCALES, type Locale } from './i18n';

// Choosing the language (TL-553). The server renders in the language its cookie names; with the
// translations flag on, LanguageSync sets that cookie from the person's saved choice, else their
// browser's languages; with it off, it clears it. No cookie: English.
export const LANG_COOKIE = 'tl-lang';

export const isLocale = (v: unknown): v is Locale => typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

// pickLocale: the saved choice, else the first browser language we have ("nl-BE" → nl), else English.
export function pickLocale(saved: string | null | undefined, browser: readonly string[]): Locale {
  if (isLocale(saved)) return saved;
  for (const tag of browser) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLocale(base) && !HIDDEN_LOCALES.includes(base)) return base;
  }
  return 'en';
}

// LANGUAGE_NAMES: each language in its own words, so anyone can find theirs.
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English', nl: 'Nederlands', de: 'Deutsch', es: 'Español', pt: 'Português (Brasil)', fr: 'Français', tlh: 'tlhIngan Hol',
};

// KONAMI unlocks Klingon in the language setting: ↑ ↑ ↓ ↓ ← → ← → b a (TL-610).
export const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

// konami: the last keys pressed, as many as the code has; it's entered when they match it.
export const konami = (keys: string[], key: string) => [...keys, key].slice(-KONAMI.length);
export const isKonami = (keys: string[]) => keys.join() === KONAMI.join();

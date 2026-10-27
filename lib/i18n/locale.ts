import { LOCALES, type Locale } from './.';

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
    if (isLocale(base)) return base;
  }
  return 'en';
}

// LANGUAGE_NAMES: each language in its own words, so anyone can find theirs.
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English', nl: 'Nederlands', de: 'Deutsch', es: 'Español', pt: 'Português (Brasil)', fr: 'Français', tlh: 'tlhIngan Hol',
};

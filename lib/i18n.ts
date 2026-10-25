import { setupI18n, type I18n } from '@lingui/core';
import { messages as en } from '@/locales/en/messages';
import { messages as nl } from '@/locales/nl/messages';
import { messages as de } from '@/locales/de/messages';
import { messages as es } from '@/locales/es/messages';
import { messages as pt } from '@/locales/pt/messages';
import { messages as fr } from '@/locales/fr/messages';
import { messages as tlh } from '@/locales/tlh/messages';

// Translations (TL-549). Strings are wrapped where they're written: in components, `const { t } =
// useLingui()` and <Trans> from '@lingui/react/macro'; in lib helpers, take the I18n and use
// i18n._(msg`…`) from '@lingui/core/macro'. `bun run i18n` extracts them into locales/<lang>/messages.po.

// pt is Brazilian Portuguese; tlh is Klingon, an easter egg (TL-610): never picked from the browser,
// and only offered once unlocked (components/settings/language.tsx).
export const LOCALES = ['en', 'nl', 'de', 'es', 'pt', 'fr', 'tlh'] as const;
export type Locale = (typeof LOCALES)[number];
export const HIDDEN_LOCALES: readonly Locale[] = ['tlh'];
const catalogs: Record<Locale, typeof en> = { en, nl, de, es, pt, fr, tlh };

// one instance per locale, never switched: a server render for one person can't change another's language
const instances = new Map<Locale, I18n>();
export function i18nFor(locale: Locale = 'en'): I18n {
  let i = instances.get(locale);
  if (!i) {
    i = setupI18n({ locale, messages: { [locale]: catalogs[locale] } });
    instances.set(locale, i);
  }
  return i;
}

// English dates read day-month (en-GB); Portuguese is Brazil's. Klingon has no calendar data: English's.
const DATE_TAGS: Record<string, string> = { en: 'en-GB', pt: 'pt-BR', tlh: 'en-GB' };

// dates: an Intl.DateTimeFormat in i18n's language (TL-553), cached. English keeps en-GB's day-month order.
const formats = new Map<string, Intl.DateTimeFormat>();
export function dates(i18n: I18n, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const tag = DATE_TAGS[i18n.locale] ?? i18n.locale;
  const key = tag + JSON.stringify(options);
  let f = formats.get(key);
  if (!f) formats.set(key, (f = new Intl.DateTimeFormat(tag, options)));
  return f;
}

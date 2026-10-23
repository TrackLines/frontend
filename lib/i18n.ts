import { setupI18n, type I18n } from '@lingui/core';
import { messages as en } from '@/locales/en/messages';
import { messages as nl } from '@/locales/nl/messages';

// Translations (TL-549). Strings are wrapped where they're written: in components, `const { t } =
// useLingui()` and <Trans> from '@lingui/react/macro'; in lib helpers, take the I18n and use
// i18n._(msg`…`) from '@lingui/core/macro'. `bun run i18n` extracts them into locales/<lang>/messages.po.

export const LOCALES = ['en', 'nl'] as const;
export type Locale = (typeof LOCALES)[number];
const catalogs: Record<Locale, typeof en> = { en, nl };

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

// dates: an Intl.DateTimeFormat in i18n's language (TL-553), cached. English keeps en-GB's day-month order.
const formats = new Map<string, Intl.DateTimeFormat>();
export function dates(i18n: I18n, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const tag = i18n.locale === 'en' ? 'en-GB' : i18n.locale;
  const key = tag + JSON.stringify(options);
  let f = formats.get(key);
  if (!f) formats.set(key, (f = new Intl.DateTimeFormat(tag, options)));
  return f;
}

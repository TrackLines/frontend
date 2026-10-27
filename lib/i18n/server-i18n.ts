import { cookies } from 'next/headers';
import { i18nFor, type Locale } from './.';
import { isLocale, LANG_COOKIE } from './locale';

// serverLocale: the language this request renders in, from the cookie LanguageSync keeps (TL-553).
export async function serverLocale(): Promise<Locale> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLocale(v) ? v : 'en';
}

// serverI18n: the I18n for a server component's render, in the reader's language.
// Use it as `const i18n = await serverI18n(); i18n._(msg`…`)`.
export async function serverI18n() {
  return i18nFor(await serverLocale());
}

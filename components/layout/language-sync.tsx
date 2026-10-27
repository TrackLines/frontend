'use client';

import { FlagsContext } from '@flags-gg/react-library';
import { useRouter } from 'next/navigation';
import { useContext, useEffect } from 'react';
import { me } from '@/lib/api';
import type { Locale } from '@/lib/i18n';
import { LANG_COOKIE, pickLocale } from '@/lib/i18n/locale';
import { useToken } from '@/lib/hooks/use-token';

// setLanguageCookie: the language the server renders in from the next request on (a year; lax, so
// links from elsewhere open in it too).
export function setLanguageCookie(locale: Locale) {
  document.cookie = `${LANG_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

// wantedLocale: with the translations flag on, the saved choice, else the browser's languages;
// with it off, English. null while flags.gg hasn't answered yet: change nothing.
export function wantedLocale(flags: Record<string, { enabled: boolean }>, saved: string | null, browser: readonly string[]): Locale | null {
  if (Object.keys(flags).length === 0) return null;
  return flags.translations?.enabled ? pickLocale(saved, browser) : 'en';
}

// LanguageSync keeps the language cookie right (TL-553) and re-renders the page when it changes.
export function LanguageSync({ current }: { current: Locale }) {
  const flags = useContext(FlagsContext);
  const token = useToken();
  const router = useRouter();
  const on = !!flags.translations?.enabled;
  useEffect(() => {
    let live = true;
    (async () => {
      const saved = on && token ? await me.language(token).then((r) => r.language, () => null) : null;
      const want = wantedLocale(flags, saved, navigator.languages);
      if (!live || !want || want === current) return;
      setLanguageCookie(want);
      router.refresh();
    })();
    return () => { live = false; };
  }, [on, Object.keys(flags).length > 0, token !== null, current]); // token refreshes mustn't refetch
  return null;
}

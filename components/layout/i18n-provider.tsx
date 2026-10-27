'use client';

import { I18nProvider } from '@lingui/react';
import { i18nFor, type Locale } from '@/lib/i18n';

// I18n: the language for everything below it (TL-550). English until choosing a language lands (TL-553).
export function I18n({ locale = 'en', children }: { locale?: Locale; children: React.ReactNode }) {
  return <I18nProvider i18n={i18nFor(locale)}>{children}</I18nProvider>;
}

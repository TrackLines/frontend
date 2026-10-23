import { expect, test } from 'bun:test';
import { I18nProvider } from '@lingui/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DashboardWorkView } from '@/components/dashboard-work';
import type { TicketSearchResult } from './api';
import { i18nFor, LOCALES } from './i18n';

const tk = { id: 't1', key: 'TL-1', title: 'A', priority: 'medium', project_name: 'P', column_name: null } as TicketSearchResult;

test('each locale has its own instance, fixed to it (TL-550)', () => {
  expect(LOCALES).toEqual(['en', 'nl']);
  expect(i18nFor('en').locale).toBe('en');
  expect(i18nFor('nl').locale).toBe('nl');
  expect(i18nFor('nl')).toBe(i18nFor('nl'));
  expect(i18nFor()).toBe(i18nFor('en'));
});

test('plurals follow the count, and an untranslated string falls back to English', () => {
  const at = (locale: 'en' | 'nl', shown: number, total: number) => renderToStaticMarkup(
    <I18nProvider i18n={i18nFor(locale)}><DashboardWorkView assigned={Array(shown).fill(tk)} created={[tk]} mentioned={[]} people={[]} totals={{ assigned: total }} /></I18nProvider>);
  expect(at('en', 0, 1)).toContain('0 of 1 ticket ·'); // a Created tab keeps the card with none assigned
  expect(at('en', 1, 9)).toContain('1 of 9 tickets ·');
  expect(at('nl', 1, 9)).toContain('Assigned to me');
});

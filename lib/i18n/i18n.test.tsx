import { expect, test } from 'bun:test';
import { I18nProvider } from '@lingui/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DashboardWorkView } from '@/components/work/dashboard-work';
import type { TicketSearchResult } from '../api';
import { dates, i18nFor, LOCALES } from './.';

const tk = { id: 't1', key: 'TL-1', title: 'A', priority: 'medium', project_name: 'P', column_name: null } as TicketSearchResult;

test('each locale has its own instance, fixed to it (TL-550)', () => {
  expect(LOCALES).toEqual(['en', 'nl', 'de', 'es', 'pt', 'fr', 'tlh']);
  expect(i18nFor('en').locale).toBe('en');
  expect(i18nFor('nl').locale).toBe('nl');
  expect(i18nFor('nl')).toBe(i18nFor('nl'));
  expect(i18nFor()).toBe(i18nFor('en'));
});

test('plurals follow the count, in each language (TL-559)', () => {
  const at = (locale: 'en' | 'nl', shown: number, total: number) => renderToStaticMarkup(
    <I18nProvider i18n={i18nFor(locale)}><DashboardWorkView assigned={Array(shown).fill(tk)} created={[tk]} mentioned={[]} people={[]} totals={{ assigned: total }} /></I18nProvider>);
  expect(at('en', 0, 1)).toContain('0 of 1 ticket ·'); // a Created tab keeps the card with none assigned
  expect(at('en', 1, 9)).toContain('1 of 9 tickets ·');
  expect(at('nl', 1, 9)).toContain('Aan mij toegewezen');
  expect(at('nl', 0, 1)).not.toContain('Assigned to me');
});

test('dates follow the language; English keeps en-GB (TL-553)', () => {
  const opts = { day: 'numeric', month: 'short', timeZone: 'UTC' } as const;
  const at = new Date('2026-10-23T00:00:00Z');
  expect(dates(i18nFor('nl'), opts).format(at)).toContain('okt');
  expect(dates(i18nFor('en'), opts).format(at)).toBe('23 Oct');
  expect(dates(i18nFor('de'), opts).format(at)).toContain('Okt');
  expect(dates(i18nFor('pt'), opts).format(at)).toContain('out');
  expect(dates(i18nFor('tlh'), opts).format(at)).toBe('23 Oct'); // no Klingon calendar: English's
});

test.each(LOCALES.filter((l) => l !== 'en'))('every %s message is translated and keeps its placeholders (TL-559, TL-611)', async (locale) => {
  const po = await Bun.file(`${import.meta.dir}/../../locales/${locale}/messages.po`).text();
  const pairs = [...po.matchAll(/^msgid (".*")\nmsgstr (".*")$/gm)].map((m) => [JSON.parse(m[1]), JSON.parse(m[2])] as [string, string]).filter(([id]) => id);
  expect(pairs.length).toBeGreaterThan(1000);
  const marks = (s: string) => [...s.matchAll(/\{(\w+)[,}]|<\/?\d+\/?>/g)].map((m) => m[1] ?? m[0]).sort().join(' ');
  for (const [id, str] of pairs) {
    expect(str).not.toBe('');
    expect(`${id} → ${marks(str)}`).toBe(`${id} → ${marks(id)}`);
  }
});

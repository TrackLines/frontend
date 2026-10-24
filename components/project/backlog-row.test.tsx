import { expect, test } from 'bun:test';
import { i18nFor } from '@/lib/i18n';
import { render as renderToStaticMarkup } from '@/test/i18n';
import type { BacklogTicket } from '@/lib/api';
import { BacklogRow } from './backlog';

const t = {
  id: 't', key: 'TL-85', type: 'feature', title: 'Roadmap updates and subscriber notifications', description: 'Let roadmap **owners** publish updates',
  labels: ['public', 'roadmap', 'notifications', 'email'], created_at: '2026-10-11T10:00:00Z', column_id: null, project_id: 'p', position: 0, created_by: 'u',
} as unknown as BacklogTicket;

test('TL-174: key, type and age on the left; labels (extra ones under them) beside the title; description below', () => {
  const html = renderToStaticMarkup(<ul><BacklogRow t={t} busy={false} onEdit={() => {}} /></ul>);
  const at = (s: string) => html.indexOf(s);
  // left column, top to bottom
  expect(at('TL-85')).toBeLessThan(at('>feature<'));
  expect(at('>feature<')).toBeLessThan(at('Created'));
  // then two labels, the +2 button under them, then the title and the description
  expect(at('Created')).toBeLessThan(at('>public<'));
  expect(at('>roadmap<')).toBeLessThan(at('+2'));
  expect(at('+2')).toBeLessThan(at('Roadmap updates and subscriber notifications'));
  expect(at('Roadmap updates and subscriber notifications')).toBeLessThan(at('Let roadmap owners publish updates'));
  expect(html).not.toContain('>notifications<'); // behind the +2
  expect(html).toContain('>Edit<');
  // TL-177 grid: labels stacked beside key/type, +N in its own column, the title beside it,
  // "Created" under the left column and the description under the +N and title
  expect(html).toMatch(/class="[^"]*col-start-2 row-span-2[^"]*flex-col/);
  expect(html).toMatch(/class="col-start-3 row-span-2 row-start-1"><button/);
  expect(html).toMatch(/class="col-span-2 col-start-3 row-start-3[^"]*">Let roadmap/);
  // Edit pinned to the top right, the date to the bottom left
  expect(html).toMatch(/class="[^"]*col-start-5 row-start-1 self-start justify-self-end[^"]*"[^>]*>Edit</);
  expect(html).toMatch(/class="col-span-2 col-start-1 row-start-3 self-end[^"]*">Created/);
});

test('no labels: no label column or +N, the title still in place', () => {
  const html = renderToStaticMarkup(<ul><BacklogRow t={{ ...t, labels: [] }} busy={false} onEdit={() => {}} /></ul>);
  expect(html).not.toContain('Ticket labels');
  expect(html).not.toContain('more labels');
  expect(html).toContain('Roadmap updates and subscriber notifications');
});

test('a closed backlog ticket says how it was closed; an open one says nothing (owner, 2026-10-17)', async () => {
  const { STATUS_LABEL } = await import('./backlog');
  expect(Object.values(STATUS_LABEL).map((m) => i18nFor('en')._(m))).toEqual(['Open', 'Done', 'Won’t do', 'Duplicates', 'All closed']);
  const row = (resolution: unknown) => renderToStaticMarkup(<ul><BacklogRow t={{ ...t, resolution } as BacklogTicket} busy={false} onEdit={() => {}} /></ul>);
  expect(row('wont_do')).toContain('>Won’t do<');
  expect(row('done')).toContain('>Done<');
  expect(row(null)).not.toContain('>Done<');
});

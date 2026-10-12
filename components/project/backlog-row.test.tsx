import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
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
  // the left column is sized to its content (a fixed width let "Created 19 minutes ago" spill over)
  expect(html).not.toMatch(/class="grid w-\d+ shrink-0/);
});

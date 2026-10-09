import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { BoardCard } from './board-card';

const board = { id: 'b1', project_id: 'p1', owner_clerk_id: 'o', name: 'Backend', description: '', created_at: '', updated_at: '' };
const now = new Date().toISOString();

test('board card splits open work and shows the sprint', () => {
  const ends = new Date(Date.now() + 3 * 86400e3 + 60e3).toISOString();
  const html = renderToStaticMarkup(<BoardCard board={{ ...board, stats: { open: 5, in_progress: 2, done: 5, urgent: 1, active: now, sprint_number: 4, sprint_ends_at: ends } }} />);
  expect(html).toContain('3 to do');
  expect(html).toContain('2 in progress');
  expect(html).toContain('5 of 10 done');
  expect(html).toContain('1 urgent');
  expect(html).toContain('Sprint 4');
  expect(html).toContain('ends in 3 days');
});

test('empty board without a sprint', () => {
  const html = renderToStaticMarkup(<BoardCard board={{ ...board, stats: { open: 0, in_progress: 0, done: 0, urgent: 0, active: now, sprint_number: null, sprint_ends_at: null } }} />);
  expect(html).toContain('No tickets yet.');
  expect(html).not.toContain('Sprint');
  expect(html).not.toContain('progressbar');
});

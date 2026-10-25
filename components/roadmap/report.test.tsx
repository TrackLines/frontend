import { expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { itemState, RoadmapPrint, roadmapFile } from './report';
import type { Roadmap, RoadmapItem } from '@/lib/api';

const item = (o: Partial<RoadmapItem>): RoadmapItem => ({ id: 'i', title: 'Item', description: '', target_date: null, position: 0, ...o });

test('an item is late once past its target date and not done (TL-617)', () => {
  expect(itemState(item({ status: 'done', target_date: '2026-01-01' }), '2026-10-25')).toBe('done');
  expect(itemState(item({ status: 'in_progress', target_date: '2026-10-24' }), '2026-10-25')).toBe('late');
  expect(itemState(item({ manual_status: 'not_started', target_date: '2026-10-25' }), '2026-10-25')).toBe('not_started'); // due today isn't late
  expect(itemState(item({}), '2026-10-25')).toBe('not_started');
});

test('the Markdown download is named like the server names it', () => {
  expect(roadmapFile('Launch: Q4 & beyond', '2026-10-25')).toBe('launch-q4-beyond-roadmap-2026-10-25.md');
  expect(roadmapFile('…', '2026-10-25')).toBe('report-roadmap-2026-10-25.md');
});

const roadmap: Roadmap = {
  id: 'r1', project_id: 'p1', title: 'Launch', description: '', visibility: 'team', created_at: '', updated_at: '', can_manage: true,
  progress: { done: 3, total: 5 },
  items: [
    item({ id: 'a', title: 'Search', status: 'done', progress: { done: 3, total: 3 } }),
    item({ id: 'b', title: 'Billing', status: 'in_progress', target_date: '2026-10-01', progress: { done: 0, total: 2 } }),
    item({ id: 'c', title: 'Mobile', manual_status: 'not_started', target_date: '2026-12-01' }),
  ],
};

test('the PDF: a cover, status donut with late items, health over time and progress, only in print', () => {
  const html = render(<RoadmapPrint roadmap={roadmap} generated={new Date('2026-10-25T12:00:00Z')}
    updates={[{ id: 'u1', health: 'at_risk', note: 'n', published_at: '2026-10-20T09:00:00Z', author: 'Sam' }]}
    burnup={[{ week_start: '2026-10-13', done: 1, total: 5 }, { week_start: '2026-10-20', done: 3, total: 5 }]} />);
  expect(html).toContain('<div class="hidden print:grid'); // nothing on screen: print only
  for (const s of ['Roadmap report', 'Launch', '3 of 5 linked tickets done', 'aria-label="Items by status"', 'aria-label="Health over time"', 'Sam', 'aria-label="Progress by item"', 'aria-label="Burn-up"']) expect(html).toContain(s);
  expect(html).toContain('Late'); // Billing is past its target date
  expect(html).toContain('1 (33%)');
});

test('no updates yet: says so, and no burn-up with a single week', () => {
  const html = render(<RoadmapPrint roadmap={roadmap} updates={[]} burnup={[{ week_start: '2026-10-20', done: 3, total: 5 }]} />);
  expect(html).toContain('No updates posted yet.');
  expect(html).not.toContain('aria-label="Burn-up"');
});

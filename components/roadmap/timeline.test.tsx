import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Gantt, Milestone, Timeline } from './timeline';
import type { RoadmapItem } from '@/lib/api';

const item = (id: string, title: string, extra: Partial<RoadmapItem> = {}): RoadmapItem => ({ id, title, description: '', target_date: null, position: Number(id), ...extra });

test('the timeline groups items by month with their status and date; progress when tickets are linked', () => {
  const html = renderToStaticMarkup(<Timeline id="r" progress={{ done: 3, total: 4 }} items={[
    item('1', 'Invite your team', { target_date: '2026-11-15', status: 'in_progress', description: 'Email invites' }),
    item('2', 'Billing', { target_date: '2026-12-01', manual_status: 'done' }),
  ]} />);
  for (const s of ['3 of 4 tickets done (75%)', 'aria-valuenow="3"', 'Invite your team', 'In progress', 'Email invites', '15 Nov', 'Billing', 'Done']) expect(html).toContain(s);
  expect(html.indexOf('Invite your team')).toBeLessThan(html.indexOf('Billing'));
  expect(html).toContain('aria-pressed="true"'); // Timeline is the starting view
});

test('an empty roadmap, and one with no linked tickets, say so', () => {
  const html = renderToStaticMarkup(<Timeline id="r" items={[]} />);
  expect(html).toContain('Nothing on this roadmap yet.');
  expect(html).toContain('statuses are manual');
});

test('long roadmaps page 20 at a time', () => {
  const many = Array.from({ length: 25 }, (_, i) => item(String(i + 1), `Item ${i + 1}`, { target_date: '2026-11-01' }));
  const html = renderToStaticMarkup(<Timeline id="r" items={many} />);
  expect(html).toContain('Showing 1–20 of 25 items');
  expect(html).toContain('Item 20<');
  expect(html).not.toContain('Item 21<');
});

test('the Gantt chart: dated items as bars or milestones with progress, undated ones listed apart', () => {
  const html = renderToStaticMarkup(<Gantt items={[
    item('1', 'Search', { start_date: '2026-11-01', target_date: '2026-11-20', progress: { done: 1, total: 2 } }),
    item('2', 'Launch', { target_date: '2026-12-01' }),
    item('3', 'Someday', { start_date: '2027-02-01' }),
  ]} />);
  for (const s of ['Search: 1 Nov to 20 Nov', '1 of 2 tickets done', 'width:50%', 'Today', 'No target date', 'Someday', 'Starts 1 Feb']) expect(html).toContain(s);
  expect(html).toMatch(/Launch: (milestone due 1 Dec|\d+ \w+ to 1 Dec)/);
  expect(renderToStaticMarkup(<Gantt items={[item('9', 'Undated')]} />)).toContain('Add target dates');
});

test('a milestone diamond fills from the bottom as its tickets get done; checked only when all are', () => {
  const at = (state: 'done' | 'overdue' | 'upcoming', done: number) => renderToStaticMarkup(<Milestone state={state} done={done} left={0} title="Launch" due="31 Oct" />);
  const fillOf = (html: string) => Number(/data-fill="([\d.]+)"/.exec(html)?.[1] ?? 0);
  expect(at('upcoming', 0)).not.toContain('data-fill'); // nothing done, empty
  const quarter = at('upcoming', 1 / 4), most = at('upcoming', 16 / 17), full = at('done', 1);
  expect(fillOf(quarter)).toBeGreaterThan(0);
  expect(fillOf(most)).toBeGreaterThan(fillOf(quarter));
  expect(fillOf(full)).toBe(24);
  expect(fillOf(most)).toBeLessThan(24);
  expect(most).not.toContain('<path'); // 16/17: nearly full, no check yet
  expect(full).toContain('<path'); // the check
  expect(quarter).toContain('Launch: milestone 25% done, due 31 Oct');
  expect(full).toContain('Launch: milestone done');
  const late = at('overdue', 0.5);
  expect(late).toContain('stroke-destructive');
  expect(late).toContain('50% done, overdue, was due 31 Oct');
});

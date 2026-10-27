import { afterEach, expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { i18nFor } from '../i18n';
import { daysUntil, dueState, dueText, localDay } from './due';
import { DueBadge } from '@/components/ticket/due-badge';
import { DueDateField } from '@/components/ticket/due-date-field';
import { notificationLine } from '../work/notifications';
import { tickets } from '../api';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('due dates count down in whole days, across months and years (TL-632)', () => {
  expect(daysUntil('2026-10-28', '2026-10-25')).toBe(3);
  expect(daysUntil('2026-11-01', '2026-10-31')).toBe(1);
  expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
  expect(daysUntil('2026-10-23', '2026-10-25')).toBe(-2);
  expect(daysUntil('2026-03-30', '2026-03-28')).toBe(2); // a clock change in between doesn't make it 1.96
  expect(['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-29'].map((d) => dueState(d, '2026-10-25'))).toEqual(['overdue', 'today', 'tomorrow', 'later']);
  expect(localDay(new Date(2026, 9, 25, 23, 59))).toBe('2026-10-25'); // the viewer's own day, not UTC's
});

test('the countdown reads naturally, in each language', () => {
  const en = i18nFor('en'), nl = i18nFor('nl');
  expect(dueText(en, '2026-10-28', '2026-10-25')).toBe('Due in 3 days');
  expect(dueText(en, '2026-10-27', '2026-10-25')).toBe('Due in 2 days');
  expect(dueText(en, '2026-10-26', '2026-10-25')).toBe('Due tomorrow');
  expect(dueText(en, '2026-10-25', '2026-10-25')).toBe('Due today');
  expect(dueText(en, '2026-10-24', '2026-10-25')).toBe('1 day overdue');
  expect(dueText(en, '2026-10-20', '2026-10-25')).toBe('5 days overdue');
  expect(dueText(nl, '2026-10-28', '2026-10-25')).not.toBe('Due in 3 days');
});

test('the badge: red once overdue, highlighted today and tomorrow, plain later; nothing without a date or once done', () => {
  const at = (due: string | null, done = false) => render(<DueBadge due={due} done={done} today="2026-10-25" />);
  expect(at('2026-10-20')).toContain('data-due="overdue"');
  expect(at('2026-10-20')).toContain('text-destructive');
  expect(at('2026-10-25')).toContain('data-due="today"');
  expect(at('2026-10-26')).toContain('data-due="tomorrow"');
  expect(at('2026-11-30')).toContain('data-due="later"');
  expect(at('2026-11-30')).toContain('title="30 Nov 2026"'); // the date itself on hover
  expect(at(null)).toBe('');
  expect(at('2026-10-20', true)).toBe(''); // done: no longer due
});

test('the form field: a date input with a clear button once set', () => {
  const empty = render(<DueDateField value="" onChange={() => {}} />);
  expect(empty).toContain('type="date"');
  expect(empty).not.toContain('Clear the due date');
  expect(render(<DueDateField value="2026-11-02" onChange={() => {}} />)).toContain('aria-label="Clear the due date"');
});

test('search asks for due and sort; reminders read as reminders, not "Someone …"', async () => {
  let asked = '';
  globalThis.fetch = (async (url: string) => { asked = String(url); return new Response('[]', { headers: { 'Content-Type': 'application/json' } }); }) as typeof fetch;
  await tickets.search({ due: 'overdue', sort: 'due' }, 'tok');
  expect(asked).toContain('due=overdue');
  expect(asked).toContain('sort=due');
  expect(notificationLine(i18nFor('en'), { kind: 'due', actor: '', text: 'TL-1: Ship it is due today' }, [])).toBe('Reminder: TL-1: Ship it is due today');
});

test('the due date is in the ticket form and on every ticket list (source)', async () => {
  const read = (p: string) => Bun.file(new URL(p, import.meta.url)).text();
  expect(await read('../../components/board/ticket-dialog.tsx')).toContain('<DueDateField value={dueDate} onChange={setDueDate} />');
  for (const f of ['../../components/board/ticket-card.tsx', '../../components/board/ticket-view.tsx', '../../app/tickets/[id]/page.tsx', '../../components/work/my-work.tsx', '../../components/work/dashboard-work.tsx', '../../components/project/backlog.tsx', '../../components/ticket/ticket-search.tsx']) {
    expect(`${f}: ${(await read(f)).includes('<DueBadge due=')}`).toBe(`${f}: true`);
  }
  expect(await read('../../components/project/backlog-sort.tsx')).toContain('due: t`Due soonest`');
});

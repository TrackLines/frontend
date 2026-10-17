import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { HistoryEntry } from '@/lib/api';
import { HistoryPanelView, historySteps } from './history-panel';

const at = (m: number) => `2026-10-17T10:${String(m).padStart(2, '0')}:00Z`;
const col = (name: string, m: number, outcome: HistoryEntry['outcome'] = 'entered', actor?: string, done = false): HistoryEntry =>
  ({ at: at(m), stage: 'column', outcome, stage_order: 1, column_name: name, board_name: 'Backend', done, actor });
const people = [{ id: 'user_ava', label: 'Ava Smith', kind: 'person' as const }, { id: 'claude', label: 'Claude', kind: 'ai' as const }];

test('history reads as what happened, newest first, with skipped stages folded in (TL-76)', () => {
  const steps = historySteps([
    { at: at(0), stage: 'backlog', outcome: 'skipped', stage_order: 0, done: false, actor: 'user_ava' },
    col('To do', 0, 'entered', 'user_ava'),
    col('In progress', 5, 'skipped', 'claude'),
    col('Done', 5, 'entered', 'claude', true),
    { at: at(9), stage: 'backlog', outcome: 'entered', stage_order: 0, done: false },
    { at: at(9), stage: 'resolved', outcome: 'entered', stage_order: 9, done: false, resolution: 'wont_do', actor: 'user_ava' },
  ], people);
  expect(steps.map((s) => `${s.who} ${s.text}${s.skipped.length ? ` (skipped ${s.skipped.join(', ')})` : ''}`)).toEqual([
    'Ava Smith closed it as won’t do',
    'TrackLin.es sent it to the backlog', // no actor: the system
    'Claude moved it to Done on Backend (skipped In progress)',
    'Ava Smith created it in To do on Backend', // starting on a board skips the backlog: not news
  ]);
});

test('a ticket made in a later column says which columns it skipped', () => {
  const steps = historySteps([
    { at: at(0), stage: 'backlog', outcome: 'skipped', stage_order: 0, done: false },
    col('To do', 0, 'skipped'), col('Done', 0, 'entered', undefined, true),
  ], people);
  expect(steps[0].text).toBe('created it in Done on Backend');
  expect(steps[0].skipped).toEqual(['To do']);
});

test('the panel lists the steps, or says when nothing has been recorded yet', () => {
  const html = renderToStaticMarkup(<HistoryPanelView people={people} entries={[{ at: at(0), stage: 'backlog', outcome: 'entered', stage_order: 0, done: false, actor: 'user_ava' }]} />);
  expect(html).toContain('aria-label="History"');
  expect(html).toContain('Ava Smith');
  expect(html).toContain('created it in the backlog');
  expect(renderToStaticMarkup(<HistoryPanelView people={people} entries={[]} />)).toContain('History is kept from October 2026');
});

test('history is on the full ticket page only, not the board’s dialog or side view', async () => {
  const read = (p: string) => Bun.file(new URL(p, import.meta.url)).text();
  const page = await read('../../app/tickets/[id]/page.tsx');
  expect(page).toContain('<HistoryPanel ');
  expect(page.indexOf('<HistoryPanel ')).toBeGreaterThan(page.indexOf('<TicketComments ')); // below the conversation
  for (const f of ['../board/ticket-view.tsx', '../board/ticket-dialog.tsx']) expect(await read(f)).not.toContain('HistoryPanel');
});

test('the board’s ticket view has a History button that opens the full page at its history', async () => {
  const view = await Bun.file(new URL('../board/ticket-view.tsx', import.meta.url)).text();
  expect(view).toContain('href={`${ticketPath(ticket)}#history`}');
  expect(view.indexOf('<CopyLink ')).toBeLessThan(view.indexOf('#history'));
  expect(renderToStaticMarkup(<HistoryPanelView people={people} entries={[]} />)).toContain('id="history"');
});

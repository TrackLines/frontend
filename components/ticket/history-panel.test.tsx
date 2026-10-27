import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { i18nFor } from '@/lib/i18n';
import type { HistoryEntry } from '@/lib/api';
import { ACTIONS, activitySteps, HistoryPanelView, historySteps, namesOf, SHOWN } from './history-panel';
import type { ActivityEntry, TicketDetail } from '@/lib/api';

const at = (m: number) => `2026-10-17T10:${String(m).padStart(2, '0')}:00Z`;
const col = (name: string, m: number, outcome: HistoryEntry['outcome'] = 'entered', actor?: string, done = false): HistoryEntry =>
  ({ at: at(m), stage: 'column', outcome, stage_order: 1, column_name: name, board_name: 'Backend', done, actor });
const people = [{ id: 'user_ava', label: 'Ava Smith', kind: 'person' as const }, { id: 'claude', label: 'Claude', kind: 'ai' as const }];

test('history reads as what happened, newest first, with skipped stages folded in (TL-76)', () => {
  const steps = historySteps(i18nFor('en'), [
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
  const steps = historySteps(i18nFor('en'), [
    { at: at(0), stage: 'backlog', outcome: 'skipped', stage_order: 0, done: false },
    col('To do', 0, 'skipped'), col('Done', 0, 'entered', undefined, true),
  ], people);
  expect(steps[0].text).toBe('created it in Done on Backend');
  expect(steps[0].skipped).toEqual(['To do']);
});

test('the panel lists the steps, or says when nothing has been recorded yet', () => {
  const html = renderToStaticMarkup(<HistoryPanelView people={people} entries={[{ id: '1', at: at(0), actor: 'user_ava', actor_kind: 'person', action: 'ticket.stage', data: { stage: 'backlog', outcome: 'entered', stage_order: 0, done: false } }]} />);
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

test('the history held elsewhere and out of reach says so, not nothing (TL-667)', async () => {
  const html = renderToStaticMarkup(<HistoryPanelView entries="unavailable" people={null} />);
  expect(html).toContain('History can’t be loaded right now. Try again shortly.');
  expect(html).not.toContain('Nothing recorded yet');
  const panel = await Bun.file(new URL('./history-panel.tsx', import.meta.url)).text();
  expect(panel).toContain("err.code === 'history_unavailable' ? 'unavailable' : null");
});

// TL-680: every change, as a sentence, never the text
const ev = (action: string, data: Record<string, unknown> = {}, actor: string | null = 'user_ava', m = 0): ActivityEntry =>
  ({ id: action + m, at: at(m), actor, actor_kind: actor ? 'person' : 'system', action, data });
const lines = (entries: ActivityEntry[], names: Record<string, string> = {}) =>
  activitySteps(i18nFor('en'), entries, people, names).map((s) => `${s.who} ${s.text}`).reverse();

test('assignment: to someone, to themself, reassigned, unassigned', () => {
  expect(lines([
    ev('ticket.assigned', { from: null, to: 'claude' }),
    ev('ticket.assigned', { from: 'claude', to: 'user_ava' }),
    ev('ticket.assigned', { from: 'user_ava', to: null }),
    ev('ticket.assigned', { from: null, to: 'user_ava' }, 'claude'),
    ev('ticket.assigned', { from: 'user_ava', to: 'claude' }, 'claude'),
    ev('ticket.assigned', { from: 'claude', to: null }),
  ])).toEqual([
    'Ava Smith assigned it to Claude',
    'Ava Smith assigned it to themself',
    'Ava Smith unassigned themself',
    'Claude assigned it to Ava Smith',
    'Claude assigned it to themself',
    'Ava Smith unassigned Claude',
  ]);
});

test('edits: several fields make one line, text says only that it changed, values in words', () => {
  const [line] = lines([ev('ticket.updated', { fields: { priority: { from: 'medium', to: 'urgent' }, title: true, description: true, estimate: { from: '3', to: '5' } } })]);
  expect(line).toBe('Ava Smith changed the priority from Medium to Urgent, edited the title, edited the description, changed the estimate from 3 to 5');
  expect(lines([ev('ticket.updated', { fields: { type: { from: 'task', to: 'bug' }, due_date: { from: null, to: '2026-10-30' }, timebox_days: { from: 1, to: 2 }, timebox_hours: { from: 0, to: 4 } } })]))
    .toEqual(['Ava Smith changed the type from Task to Bug, set the due date to 30 Oct 2026, changed the timebox']);
});

test('links name the tickets the page knows, and the rest read sensibly', () => {
  const names = namesOf({ parent: { id: 'e', title: 'Audit epic', done: false }, children: [], blocked_by: [{ id: 'b', title: 'API first', done: false }], blocks: [] } as unknown as TicketDetail);
  expect(lines([
    ev('ticket.blocked_by_changed', { added: ['b'] }),
    ev('ticket.blocked_by_changed', { removed: ['gone'] }),
    ev('ticket.parent_changed', { from: null, to: 'e' }),
    ev('ticket.labels_changed', { added: ['bug', 'ui'] }),
    ev('attachment.added', { name: 'spec.pdf', size: 10 }),
    ev('pr.state_changed', { repo: 'tl/web', number: 42, from: 'open', to: 'merged' }, null),
  ], names)).toEqual([
    'Ava Smith marked it blocked by API first',
    'Ava Smith removed the blocker another ticket',
    'Ava Smith made it part of Audit epic',
    'Ava Smith added the labels bug, ui',
    'Ava Smith attached spec.pdf',
    'TrackLin.es merged pull request tl/web#42',
  ]);
});

// the backend's actions (its OpenAPI, GET /tickets/{id}/activity): each has its own sentence
test('every recorded action has a sentence', () => {
  expect(ACTIONS).toHaveLength(23);
  for (const a of ACTIONS) {
    const data = a === 'ticket.stage' ? { stage: 'backlog', outcome: 'entered' } : a === 'ticket.updated' ? { fields: { title: true } } : { from: 'x', to: 'y', added: ['a'], name: 'f', repo: 'r', number: 1, of: 'x' };
    const [line] = lines([ev(a, data)]);
    expect(line).not.toContain('made a change');
    expect(line.length).toBeGreaterThan('Ava Smith '.length);
  }
  expect(lines([ev('something.new')])).toEqual(['Ava Smith made a change']); // a newer backend's action
});

test('a long history shows the newest first, then Show older', () => {
  const many = Array.from({ length: SHOWN + 5 }, (_, i) => ev('comment.added', {}, 'user_ava', i % 60));
  const html = renderToStaticMarkup(<HistoryPanelView people={people} entries={many} />).replace(/<!-- -->/g, '');
  expect(html.match(/commented/g)).toHaveLength(SHOWN);
  expect(html).toContain('Show older');
  expect(renderToStaticMarkup(<HistoryPanelView people={people} entries={many.slice(0, 3)} />)).not.toContain('Show older');
});

test('the panel reads the activity, and the page gives it the ticket for names (source)', async () => {
  const panel = await Bun.file(new URL('./history-panel.tsx', import.meta.url)).text();
  expect(panel).toContain('tickets.activity(ticketId, token)');
  const page = await Bun.file(new URL('../../app/tickets/[id]/page.tsx', import.meta.url)).text();
  expect(page).toContain('<HistoryPanel ticketId={tk.id} token={token} people={people} ticket={tk} />');
});

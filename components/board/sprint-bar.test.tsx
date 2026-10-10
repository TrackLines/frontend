import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Board } from '@/lib/api';
import { SprintBar } from './sprint-bar';

const board: Board = {
  id: 'b', project_id: 'p', owner_clerk_id: 'o', name: 'Backend', description: '', created_at: '', updated_at: '',
  columns: [
    { id: 'c1', name: 'To do', position: 0, tickets: [] },
    { id: 'c2', name: 'Done', position: 1, tickets: [] },
  ],
};

test('no sprint: offers to start one', () => {
  const html = renderToStaticMarkup(<SprintBar board={board} token="t" canManage onChanged={() => {}} />);
  expect(html).toContain('No sprint running');
  expect(html).toContain('Start sprint');
  expect(html).not.toContain('Close sprint');
});

test('members can see sprint information without workflow controls', () => {
  const html = renderToStaticMarkup(<SprintBar board={board} token="t" canManage={false} onChanged={() => {}} />);
  expect(html).toContain('No sprint running');
  expect(html).not.toContain('Start sprint');
  expect(html).not.toContain('Close sprint');
});

test('open sprint: number, dates, time left, close', () => {
  const ends = new Date(Date.now() + 3 * 24 * 3600 * 1000 + 3600 * 1000).toISOString();
  const html = renderToStaticMarkup(
    <SprintBar
      board={{ ...board, sprint: { id: 's', board_id: 'b', number: 4, length_days: 14, starts_at: '2026-10-01T09:00:00Z', ends_at: ends, closed_at: null } }}
      token="t"
      canManage
      onChanged={() => {}}
    />,
  );
  expect(html).toContain('>Sprint 4<');
  expect(html).toContain('· 14 days');
  expect(html).toContain('ends in 4 days');
  expect(html).toContain('Close sprint');
  expect(html).not.toContain('Change length'); // a board setting: only in Edit board mode
  expect(html).not.toContain('Start sprint');
});

test('change length while editing the board; close sprint only outside it', () => {
  const sprint = { id: 's', board_id: 'b', number: 4, length_days: 14, starts_at: '2026-10-01T09:00:00Z', ends_at: new Date(Date.now() + 86_400_000).toISOString(), closed_at: null };
  const html = (editMode: boolean, canManage: boolean) => renderToStaticMarkup(
    <SprintBar board={{ ...board, sprint }} token="t" canManage={canManage} editMode={editMode} onChanged={() => {}} />,
  );
  expect(html(true, true)).toContain('Change length');
  expect(html(true, true)).not.toContain('Close sprint'); // closing isn't a setting
  expect(html(false, true)).not.toContain('Change length');
  expect(html(false, true)).toContain('Close sprint');
  expect(html(true, false)).not.toContain('Change length');
  expect(html(false, false)).not.toContain('Close sprint');
});

test('scheduled sprint shows its start date without current sprint actions', () => {
  const starts = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
  const ends = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();
  const html = renderToStaticMarkup(<SprintBar
    board={{ ...board, sprint: { id: 's', board_id: 'b', number: 2, length_days: 7, starts_at: starts, ends_at: ends, closed_at: null } }}
    token="t" canManage editMode onChanged={() => {}}
  />);
  expect(html).toContain('Scheduled · starts');
  expect(html).toContain('Change length');
  expect(html).not.toContain('Close sprint');
  expect(html).not.toContain('Charts');
});

test('members keep sprint history and charts but cannot close a sprint', () => {
  const ends = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
  const html = renderToStaticMarkup(<SprintBar
    board={{ ...board, sprint: { id: 's', board_id: 'b', number: 2, length_days: 14, starts_at: '2026-10-01T09:00:00Z', ends_at: ends, closed_at: null } }}
    token="t" canManage={false} onChanged={() => {}}
  />);
  expect(html).toContain('Past sprints');
  expect(html).toContain('Charts');
  expect(html).not.toContain('Close sprint');
});

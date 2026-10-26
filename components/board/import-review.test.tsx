import { afterEach, expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { importReview, tickets, type Board, type ReviewTicket } from '@/lib/api';
import { ImportReview, ReviewList } from './import-review';
import { SprintBar } from './sprint-bar';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const board: Board = { id: 'b1', project_id: 'p', owner_clerk_id: 'o', name: 'Shop board', description: '', created_at: '', updated_at: '', columns: [] };
const list: ReviewTicket[] = [
  { id: 't1', key: 'SHOP-3', title: 'Old idea', type: 'task', priority: 'medium', updated_at: '2024-01-02T10:00:00Z', url: 'https://acme.atlassian.net/browse/SHOP-3' },
  { id: 't2', key: 'SHOP-9', title: 'Stale bug', type: 'bug', priority: 'high', updated_at: '2024-03-02T10:00:00Z', url: '' },
];

test('an imported board says how many tickets wait for review; none, nothing (TL-545)', () => {
  const html = render(<ImportReview board={{ ...board, to_review: 2 }} token="t" canManage onChanged={() => {}} />);
  expect(html).toContain('2 imported tickets to review before the first sprint');
  expect(html).toContain('Review them');
  expect(render(<ImportReview board={{ ...board, to_review: 1 }} token="t" canManage onChanged={() => {}} />)).toContain('1 imported ticket to review');
  expect(render(<ImportReview board={board} token="t" canManage onChanged={() => {}} />)).toBe('');
});

test('the review list: when each last changed, the original, keep and close; read-only for members; settled', () => {
  const html = render(<ReviewList list={list} canManage busy={null} onKeep={() => {}} onClose={() => {}} />);
  for (const s of ['SHOP-3', 'Old idea', 'last changed', 'href="https://acme.atlassian.net/browse/SHOP-3"', '>Keep<', 'Close as won’t do']) expect(html).toContain(s);
  expect(html.match(/>Keep</g)?.length).toBe(2);
  const member = render(<ReviewList list={list} canManage={false} busy={null} onKeep={() => {}} onClose={() => {}} />);
  expect(member).not.toContain('>Keep<');
  expect(member).toContain('team leader settles these');
  expect(render(<ReviewList list={[]} canManage busy={null} onKeep={() => {}} onClose={() => {}} />)).toContain('All settled');
});

test('keep and close call the API (TL-541 contract)', async () => {
  const asked: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    asked.push(`${init?.method ?? 'GET'} ${String(url).replace(/^.*\/api/, '')}${init?.body ? ` ${init.body}` : ''}`);
    return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  await importReview.list('b1', 't');
  await importReview.keep('b1', 't1', 't');
  await tickets.resolve('t2', 't', 'wont_do', 'stale');
  expect(asked).toEqual(['GET /boards/b1/import-review', 'POST /boards/b1/import-review/t1/keep', 'POST /tickets/t2/resolve {"resolution":"wont_do","reason":"stale"}']);
});

test('Start sprint waits for the review, and says so; Plan sprint too (source)', async () => {
  const waiting = render(<SprintBar board={{ ...board, to_review: 2 }} token="t" canManage onChanged={() => {}} />);
  expect(waiting).toMatch(/<button[^>]* disabled=""[^>]*title="Review the imported tickets first"[^>]*>Start sprint</);
  expect(waiting).toContain('2 imported tickets to review before the first sprint');
  expect(render(<SprintBar board={board} token="t" canManage onChanged={() => {}} />)).not.toMatch(/<button[^>]* disabled=""[^>]*>Start sprint</);
  const refinement = await Bun.file(new URL('../project/refinement.tsx', import.meta.url)).text();
  expect(refinement).toContain('disabled={busy || (b.to_review ?? 0) > 0}');
  expect(refinement).toContain('settle them on the board</Link> before planning its first sprint');
});

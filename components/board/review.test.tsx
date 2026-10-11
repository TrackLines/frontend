import { afterEach, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { tickets } from '@/lib/api';
import { AgentReviewSetting, NeedsReviewBadge, ReviewActions } from './review';
import { TicketCard } from './ticket-card';

const waiting = { id: 't1', review_requested_at: '2026-10-11T20:00:00Z' };

test('the Needs review badge and actions show only while a ticket waits', () => {
  expect(renderToStaticMarkup(<NeedsReviewBadge ticket={waiting} />)).toContain('Needs review');
  expect(renderToStaticMarkup(<NeedsReviewBadge ticket={{ review_requested_at: null }} />)).toBe('');
  const html = renderToStaticMarkup(<ReviewActions ticket={waiting} token="x" onReviewed={() => {}} />);
  expect(html).toContain('>Approve<');
  expect(html).toContain('>Send back<');
  expect(renderToStaticMarkup(<ReviewActions ticket={{ id: 't2', review_requested_at: null }} token="x" onReviewed={() => {}} />)).toBe('');
});

test('cards waiting for review say so', () => {
  const card = (review_requested_at: string | null) => renderToStaticMarkup(
    <TicketCard ticket={{ id: 't', column_id: 'c', title: 'Agent work', description: '', position: 0, created_by: 'Claude', review_requested_at }} token="x" onUpdated={() => {}} onDeleted={() => {}} />,
  );
  expect(card('2026-10-11T20:00:00Z')).toContain('Needs review');
  expect(card(null)).not.toContain('Needs review');
});

test('the board setting shows its current state', () => {
  const on = renderToStaticMarkup(<AgentReviewSetting boardId="b" on token="x" onChanged={() => {}} />);
  expect(on).toContain('Agent work needs review');
  expect(on).toMatch(/aria-pressed="true"[^>]*>On<|data-pressed[^>]*>On</);
});

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('approve and send back post the review', async () => {
  const sent: unknown[] = [];
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)));
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  await tickets.review('t1', true, '', 'tok');
  await tickets.review('t1', false, ' Missing tests ', 'tok');
  expect(sent).toEqual([{ approve: true }, { approve: false, comment: 'Missing tests' }]);
});

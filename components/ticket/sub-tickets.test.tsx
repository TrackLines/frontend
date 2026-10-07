import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TicketDetail } from '@/lib/api';
import { PartOf, SubTickets, subTicketSummary } from './sub-tickets';

const base = { id: 't', project_id: 'p', blocked_by: [], blocks: [] } as unknown as TicketDetail;

test('summary counts done children', () => {
  expect(subTicketSummary([{ done: true }, { done: false }, { done: true }])).toBe('2 of 3 done');
});

test('parent shows children with progress and detach buttons', () => {
  const html = renderToStaticMarkup(<SubTickets token="x" onChanged={() => {}} ticket={{ ...base, children: [{ id: 'a', title: 'schema', done: true }, { id: 'b', title: 'api', done: false }] }} />);
  expect(html).toContain('1 of 2 done');
  expect(html).toContain('href="/tickets/a"');
  expect(html).toContain('Detach api');
});

test('sub-ticket links to its parent; top-level shows nothing', () => {
  expect(renderToStaticMarkup(<PartOf ticket={{ ...base, parent: { id: 'e', title: 'Epic', done: false } }} />)).toContain('href="/tickets/e"');
  expect(renderToStaticMarkup(<PartOf ticket={base} />)).toBe('');
});

import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { i18nFor } from '@/lib/i18n';
import type { TicketDetail } from '@/lib/api';
import { ParentSection, SubTickets, subTicketSummary } from './sub-tickets';

const base = { id: 't', project_id: 'p', blocked_by: [], blocks: [] } as unknown as TicketDetail;

test('summary counts done children', () => {
  expect(subTicketSummary(i18nFor('en'), [{ done: true }, { done: false }, { done: true }])).toBe('2 of 3 done');
});

test('parent shows children with progress and detach buttons', () => {
  const html = renderToStaticMarkup(<SubTickets token="x" onChanged={() => {}} ticket={{ ...base, children: [{ id: 'a', title: 'schema', done: true }, { id: 'b', title: 'api', done: false }] }} />);
  expect(html).toContain('1 of 2 done');
  expect(html).toContain('href="/tickets/a"');
  expect(html).toContain('Detach api');
});

test('the parent has its own section, only when there is one: "Epic" for its epic, linked, with detach (TL-686)', () => {
  const parent = { id: 'e', title: 'Audit', done: false };
  const epic = renderToStaticMarkup(<ParentSection token="x" onChanged={() => {}} ticket={{ ...base, parent, epic_id: 'e' }} />);
  for (const s of ['>Epic<', 'href="/tickets/e"', 'Audit', 'aria-label="Detach from Audit"']) expect(epic).toContain(s);
  const plain = renderToStaticMarkup(<ParentSection token="x" onChanged={() => {}} ticket={{ ...base, parent, epic_id: 'other' }} />);
  expect(plain).toContain('>Parent ticket<');
  expect(renderToStaticMarkup(<ParentSection token="x" onChanged={() => {}} ticket={base} />)).toBe('');
});

test('linking an existing ticket and making a new one say which they do (TL-686)', () => {
  const html = renderToStaticMarkup(<SubTickets token="x" onChanged={() => {}} ticket={base} />);
  expect(html).toContain('Link sub-ticket…');
  expect(html).toContain('New sub-ticket…');
  expect(html).not.toContain('Add a sub-ticket');
});

test('a done ticket offers no new sub-tickets, but children can still be detached (TL-528)', () => {
  const html = renderToStaticMarkup(<SubTickets token="x" onChanged={() => {}} ticket={{ ...base, done: true, children: [{ id: 'a', title: 'schema', done: true }] }} />);
  expect(html).not.toContain('Link sub-ticket');
  expect(html).not.toContain('New sub-ticket');
  expect(html).toContain('Detach schema');
});

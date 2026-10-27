import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import type { TicketDetail } from '@/lib/api';
import { firstTab, TicketLinks } from './ticket-links';

const base = { id: 't', project_id: 'p', type: 'task', children: [], blocked_by: [], blocks: [] } as unknown as TicketDetail;
const dep = (id: string) => ({ id, title: id, done: false });

// TL-686: sub-tickets, what blocks it and what it blocks, as tabs called Ticket links
test('the tabs, with their counts, under one heading', () => {
  const html = renderToStaticMarkup(<TicketLinks token="x" onChanged={() => {}} ticket={{ ...base, children: [dep('a')], blocked_by: [dep('b'), dep('c')] }} />).replace(/<!-- -->/g, '');
  for (const s of ['Ticket links', 'Sub-tickets (1)', 'Blocked by (2)', 'Blocks (0)', 'id="blocked-by"']) expect(html).toContain(s);
});

test('they open where there is something: sub-tickets (or an epic), then blockers, then what it blocks; the badge link opens Blocked by', () => {
  expect(firstTab(base)).toBe('subs');
  expect(firstTab({ ...base, type: 'epic' })).toBe('subs');
  expect(firstTab({ ...base, blocked_by: [dep('b')] })).toBe('blocked-by');
  expect(firstTab({ ...base, blocks: [dep('b')] })).toBe('blocks');
  expect(firstTab({ ...base, children: [dep('a')], blocked_by: [dep('b')] })).toBe('subs');
  expect(firstTab({ ...base, children: [dep('a')] }, '#blocked-by')).toBe('blocked-by');
});

test('the full page shows the parent section and the tabs, not the old line and sections (source)', async () => {
  const page = await Bun.file(new URL('../../app/tickets/[id]/page.tsx', import.meta.url)).text();
  expect(page).toContain('<ParentSection ticket={tk}');
  expect(page).toContain('<TicketLinks ticket={tk}');
  for (const gone of ['<PartOf', '<SubTickets', '<Dependencies']) expect(page).not.toContain(gone);
  // the backlog's edit dialog names the parent too
  const dialog = await Bun.file(new URL('../board/ticket-dialog.tsx', import.meta.url)).text();
  expect(dialog).toContain('tickets.get(ticket.id, token).then((d) => { if (live) setParent(d.parent ?? null); }');
  expect(dialog).toContain('<Trans>Part of <Link href={`/tickets/${parent.id}`}');
});

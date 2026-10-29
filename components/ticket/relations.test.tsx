import { expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { TicketRelations } from './relations';
import { BlockedBadge } from './blocked-badge';

test('a sub-ticket links its parent, and a blocked one lists and links what it waits on (TL-639)', () => {
  const html = render(<TicketRelations parent={{ id: 'p1', title: 'Due dates on tickets', done: false }}
    blockedBy={[{ id: 'b1', title: 'Backend: due dates on tickets', done: false }]} blocks={[{ id: 'x1', title: 'Release notes', done: false }]} />);
  expect(html).toContain('Part of');
  expect(html).toContain('href="/tickets/p1"');
  expect(html).toContain('Blocked by');
  expect(html).toContain('href="/tickets/b1"');
  expect(html).toContain('Backend: due dates on tickets');
  expect(html).toContain('Blocks');
  expect(html).toContain('href="/tickets/x1"');
});

test('blockers all done: says so instead of "Blocked by"; nothing at all without relations', () => {
  const html = render(<TicketRelations blockedBy={[{ id: 'b1', title: 'Done thing', done: true }]} blocks={[]} />);
  expect(html).toContain('Was waiting on (all done)');
  expect(html).not.toContain('Blocked by');
  expect(render(<TicketRelations parent={null} blockedBy={[]} blocks={[]} />)).toBe('');
});

test('the Blocked badge links to the list of what blocks it, where there is one', () => {
  expect(render(<BlockedBadge href="#blocked-by" />)).toContain('href="#blocked-by"');
  expect(render(<BlockedBadge />)).not.toContain('href');
});

test('the board\'s ticket view loads the parent and blockers, and the page links the badge (source)', async () => {
  const read = (p: string) => Bun.file(new URL(p, import.meta.url)).text();
  const view = await read('../board/ticket-view.tsx');
  expect(view).toContain('tickets.get(ticket.id, token)');
  expect(view).toContain('<TicketRelations parent={detail.parent} blockedBy={detail.blocked_by} blocks={detail.blocks} here={ticket.project_id} />');
  expect(await read('../../app/tickets/[id]/page.tsx')).toContain('<BlockedBadge href="#blocked-by" />');
  expect(await read('./ticket-links.tsx')).toContain('id="blocked-by"'); // the Ticket links panel, opening its Blocked by tab (TL-686)
});

test('a blocker in another project reads "Project - Title"; one in this project just its title (TL-715)', () => {
  const html = render(<TicketRelations here="p" blockedBy={[{ id: 'b1', title: 'Bob', done: false, project_id: 'q', project_name: 'Bill' }]}
    blocks={[{ id: 'x1', title: 'Release', done: false, project_id: 'p', project_name: 'TrackLines' }]} />);
  expect(html).toContain('Bill - </span>Bob');
  expect(html).not.toContain('TrackLines');
});

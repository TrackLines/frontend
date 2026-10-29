import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { BlockedBy, Blocks, DepRow, projectTickets } from './dependencies';
import { afterEach } from 'bun:test';
import type { TicketDetail } from '@/lib/api';

const base = { id: 't', project_id: 'p', blocked_by: [], blocks: [] } as unknown as TicketDetail;

test('nothing blocking reads as free to pick up; blockers link, with done ones struck through', () => {
  expect(renderToStaticMarkup(<BlockedBy ticket={base} token="tok" onChanged={() => {}} />)).toContain('Nothing — it can be picked up.');
  const html = renderToStaticMarkup(<BlockedBy ticket={{ ...base, blocked_by: [{ id: 'a', title: 'API first', done: false }, { id: 'b', title: 'Schema', done: true }] }} token="tok" onChanged={() => {}} />);
  for (const s of ['href="/tickets/a"', 'API first', 'Stop waiting on API first', 'Add a blocker']) expect(html).toContain(s);
  expect(html).toMatch(/line-through[^>]*>Schema/);
  // what it blocks: linked, not editable here (set from those tickets' own Blocked by)
  const blocks = renderToStaticMarkup(<Blocks ticket={{ ...base, blocks: [{ id: 'c', title: 'Release', done: false }] }} />);
  expect(blocks).toContain('href="/tickets/c"');
  expect(blocks).not.toContain('<button');
  expect(renderToStaticMarkup(<Blocks ticket={base} />)).toContain('Nothing waits on it.');
  expect(renderToStaticMarkup(<ul><DepRow d={{ id: 'x', title: 'X', done: false }} /></ul>)).not.toContain('<button');
});

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('projectTickets gathers every board’s tickets (last column = done) and the backlog', async () => {
  globalThis.fetch = (async (url: string) => {
    const path = new URL(url, 'http://x').pathname;
    const body = path.endsWith('/projects/p') ? { id: 'p', boards: [{ id: 'b1' }] }
      : path.endsWith('/projects/p/backlog') ? [{ id: 'k', title: 'later' }]
      : { id: 'b1', columns: [{ tickets: [{ id: 'o', title: 'open' }] }, { tickets: [{ id: 'd', title: 'shipped' }] }] };
    return Response.json(body);
  }) as typeof fetch;
  expect(await projectTickets('p', 'tok')).toEqual([{ id: 'o', title: 'open', done: false }, { id: 'd', title: 'shipped', done: true }, { id: 'k', title: 'later', done: false }]);
});

test('a done ticket can drop blockers but not add them (TL-528)', () => {
  const html = renderToStaticMarkup(<BlockedBy ticket={{ ...base, done: true, blocked_by: [{ id: 'a', title: 'API first', done: true }] }} token="tok" onChanged={() => {}} />);
  expect(html).not.toContain('Add a blocker');
  expect(html).toContain('Stop waiting on API first');
});

test('the blocker picker offers the org’s other projects and loads the chosen one’s tickets (TL-715)', async () => {
  const src = await Bun.file(new URL('./dependencies.tsx', import.meta.url)).text();
  expect(src).toContain('projects.list(token)');
  expect(src).toContain('onValueChange={(v) => v && load(String(v))}');
  const html = renderToStaticMarkup(<BlockedBy ticket={{ ...base, blocked_by: [{ id: 'a', title: 'Mobile key', done: false, project_id: 'bf', project_name: 'Bugfixes' }] }} token="tok" onChanged={() => {}} />);
  expect(html).toContain('Bugfixes - </span>Mobile key');
  expect(renderToStaticMarkup(<Blocks ticket={{ ...base, blocks: [{ id: 'c', title: 'Release', done: false, project_id: 'p', project_name: 'Here' }] }} />)).not.toContain('Here');
});

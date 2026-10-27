import { expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import type { AuditEvent } from '@/lib/api';
import { AuditLogCard, AuditLogView } from './audit-log';

const people = [{ id: 'user_sam', label: 'Sam Doe', kind: 'person' as const }];
const ev = (id: string, action: string, extra: Partial<AuditEvent> = {}): AuditEvent =>
  ({ id, at: '2026-10-27T11:00:00Z', actor: 'user_sam', actor_kind: 'person', action, target_type: null, target_id: null, project_id: null, data: {}, ...extra });

// TL-671: when, who, what and the target, a row each
test('the log is a table: who, what, and a link while the target exists', () => {
  const html = render(<AuditLogView people={people} projects={[{ id: 'p1', name: 'Shop' } as never]} events={[
    ev('e1', 'project.renamed', { target_type: 'project', target_id: 'p1', data: { from: 'Shop', to: 'Store' } }),
    ev('e2', 'org.plan_changed', { actor: null, data: { plan: 'pro' } }),
    ev('e3', 'board.deleted', { target_type: 'board', target_id: 'b1', data: { name: 'Web' } }),
  ]} />);
  expect(html).toContain('<table');
  expect(html).toContain('Sam Doe');
  expect(html).toContain('Renamed the project Shop to Store');
  expect(html).toContain('href="/projects/p1"');
  expect(html).toContain('TrackLin.es'); // the system's own change
  expect(html).toContain('Deleted the board Web');
  expect(html).not.toContain('/boards/b1');
  expect(render(<AuditLogView people={people} projects={[]} events={[]} />)).toContain('Nothing in the log for these filters.');
});

test('the card opens the log on Pro and Enterprise; Free sees what it takes, with no page', () => {
  const paid = render(<AuditLogCard token="t" plan={{ plan: 'pro', paid: true, project_limit: 5 }} />);
  expect(paid).toContain('href="/settings/audit"');
  const free = render(<AuditLogCard token="t" plan={{ plan: 'free', paid: false, project_limit: 1 }} />);
  expect(free).toContain('Comes with the Pro and Enterprise plans');
  expect(free).toContain('data-audit-upsell');
  expect(free).not.toContain('/settings/audit');
});

// the page and its wiring (it needs the router, so read its source): admins only, the plan, the flag;
// filters in the URL; load more on the cursor; the retention note by plan
test('the page: admins only, paid plans, filters in the URL, load more', async () => {
  const page = await Bun.file(new URL('../../app/settings/audit/page.tsx', import.meta.url)).text();
  expect(page).toContain('data-audit-admins');
  expect(page).toContain('!plan.paid');
  expect(page).toContain("is('audit-service').enabled()");
  expect(page).toContain("enterprise={plan.plan === 'enterprise'}");
  const log = await Bun.file(new URL('./audit-log.tsx', import.meta.url)).text();
  expect(log).toContain('router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })');
  expect(log).toContain('cursor: page.next_cursor');
  expect(log).toContain('events: [...page.events, ...older.events]');
  expect(log).toContain('Kept for a year on Pro.');
  expect(log).toContain('Kept while your organization exists on Enterprise.');
  const settings = await Bun.file(new URL('../../app/settings/page.tsx', import.meta.url)).text();
  expect(settings).toContain("{admin && is('audit-service').enabled() && <AuditLogCard plan={plan} token={token} />}");
});

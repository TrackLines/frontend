import { expect, test } from 'bun:test';
import { setupI18n } from '@lingui/core';
import type { AuditEvent } from '@/lib/api';
import { ACTION_FILTERS, auditLink, auditSentence, filtersOf, ORG_ACTIONS, whoDid } from './audit';

const i18n = setupI18n({ locale: 'en', messages: { en: {} } });
const ev = (action: string, data: Record<string, unknown> = {}, extra: Partial<AuditEvent> = {}): AuditEvent =>
  ({ id: 'e', at: '2026-10-27T11:00:00Z', actor: 'user_admin', actor_kind: 'person', action, target_type: null, target_id: null, project_id: null, data, ...extra });
const people = [{ id: 'user_sam', label: 'Sam Doe', kind: 'person' as const }, { id: 'user_admin', label: 'Alex Roe', kind: 'person' as const }];

// TL-671: a sentence for every action in the backend's org log catalogue; an unknown one still reads
test('every org action reads as a sentence', () => {
  expect(ORG_ACTIONS).toHaveLength(35);
  for (const a of ORG_ACTIONS) {
    const s = auditSentence(i18n, ev(a, { name: 'Shop', from: 'a', to: 'b', change: 'added', user: 'user_sam', provider: 'jira', host: 'x.io', source: 'jira', state: 'done', created: 3, kind: 'csv', plan: 'pro', number: 4, board_name: 'Web', changed: 2, count: 3 }, { target_id: 'user_sam' }), people);
    expect(s, a).not.toContain('Made a change');
    expect(s, a).not.toBe('');
  }
  expect(auditSentence(i18n, ev('thing.new'), people)).toBe('Made a change (thing.new)');
});

test('sentences name things as they were, and people by name', () => {
  const read = (a: string, d: Record<string, unknown>, target?: string) => auditSentence(i18n, ev(a, d, { target_id: target ?? null }), people);
  expect(read('admin.granted', {}, 'user_sam')).toBe('Made Sam Doe an admin');
  expect(read('team.members_changed', { name: 'Platform', user: 'user_sam', change: 'made_leader' })).toBe('Made Sam Doe a leader of Platform');
  expect(read('api_key.created', { kind: 'service', name: 'CI', read_only: true })).toBe('Created the service key “CI” (read-only)');
  expect(read('project.renamed', { from: 'Shop', to: 'Store' })).toBe('Renamed the project Shop to Store');
  expect(read('integration.connected', { provider: 'google-calendar', domain: 'acme.com' })).toBe('Connected Google Calendar (acme.com)');
  expect(read('import.run', { source: 'jira', state: 'failed' })).toBe('An import from jira failed');
  expect(read('export.downloaded', { kind: 'audit_csv' })).toBe('Exported the audit log');
  expect(read('org.plan_changed', { plan: 'enterprise' })).toBe('Changed the plan to Enterprise');
  expect(whoDid(i18n, ev('org.deleted', {}, { actor: null }), people)).toBe('TrackLin.es');
  expect(whoDid(i18n, ev('org.deleted'), people)).toBe('Alex Roe');
});

test('the target opens where it still exists', () => {
  const projects = new Set(['p1']);
  expect(auditLink(ev('project.renamed', {}, { target_type: 'project', target_id: 'p1' }), projects)).toBe('/projects/p1');
  expect(auditLink(ev('project.created', {}, { target_type: 'project', target_id: 'p2' }), projects)).toBeNull(); // gone since
  expect(auditLink(ev('board.archived', {}, { target_type: 'board', target_id: 'b1' }), projects)).toBe('/boards/b1');
  expect(auditLink(ev('board.deleted', {}, { target_type: 'board', target_id: 'b1' }), projects)).toBeNull();
  expect(auditLink(ev('ticket.restored', {}, { target_type: 'ticket', target_id: 't1' }), projects)).toBe('/tickets/t1');
  expect(auditLink(ev('ticket.purged', {}, { target_type: 'ticket', target_id: 't1' }), projects)).toBeNull();
  expect(auditLink(ev('api_key.created', {}, { target_type: 'api_key', target_id: 'k1' }), projects)).toBeNull();
});

test('filters come from the URL: days are local days, to included', () => {
  const f = filtersOf(new URLSearchParams('actor=user_sam&action=api_key.&project=p1&from=2026-10-01&to=2026-10-02&junk=1'));
  expect(f.actor).toBe('user_sam');
  expect(f.action).toBe('api_key.');
  expect(f.project).toBe('p1');
  expect(f.from).toBe(new Date('2026-10-01T00:00:00').toISOString());
  expect(f.to).toBe(new Date('2026-10-03T00:00:00').toISOString());
  expect(filtersOf(new URLSearchParams('from=yesterday')).from).toBeUndefined();
  expect(ACTION_FILTERS.every((a) => a.value.endsWith('.') || (ORG_ACTIONS as readonly string[]).includes(a.value))).toBe(true);
});

test('the API gets the filters, a cursor for older pages, and none for the export', async () => {
  const { auditLog } = await import('@/lib/api');
  const real = globalThis.fetch;
  const asked: string[] = [];
  globalThis.fetch = (async (url: string) => { asked.push(String(url)); return Response.json({ events: [], next_cursor: null }); }) as unknown as typeof fetch;
  try {
    await auditLog.list({ actor: 'user_sam', action: 'board.', cursor: '41' }, 't');
    await auditLog.exportCSV({ project: 'p1', cursor: '41' }, 't');
  } finally {
    globalThis.fetch = real;
  }
  expect(asked[0]).toEndWith('/org/audit?actor=user_sam&action=board.&cursor=41');
  expect(asked[1]).toEndWith('/org/audit/export.csv?project=p1');
});

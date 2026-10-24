import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import type { TicketBugfixes } from '@/lib/api';
import { BugfixesPanel, BugfixesPanelView } from './bugfixes-panel';

const base: TicketBugfixes = { source: 'bugfixes', project: '4703', report_id: '15098', url: 'https://bugfix.es/r/15098', available: true, regressed: false };
const report = { title: 'Error in RunAutoClose', occurrences: 14, status: 'open' as const, last_seen: '2026-10-11T09:23:38Z', levels: ['error'], file: 'src/internal/sprints/postgres.go', line: 223 };
const view = (data: TicketBugfixes | null, failed = false) => renderToStaticMarkup(<BugfixesPanelView data={data} failed={failed} />);

test('only tickets Bugfixes made get a panel', () => {
  expect(renderToStaticMarkup(<BugfixesPanel ticket={{ id: 't', external_source: null }} token="x" />)).toBe('');
  expect(renderToStaticMarkup(<BugfixesPanel ticket={{ id: 't', external_source: 'bugfixes' }} token="x" />)).toContain('Loading the Bugfixes report');
});

test('the report: occurrences, level, where, link', () => {
  const html = view({ ...base, report });
  for (const s of ['Error in RunAutoClose', '>14<', '>error<', 'postgres.go:223', 'href="https://bugfix.es/r/15098"', 'Open in Bugfixes']) expect(html).toContain(s);
  expect(html).not.toContain('Regressed');
});

test('regressed is flagged', () => {
  expect(view({ ...base, report, regressed: true })).toContain('Regressed');
});

test('linked but no details: not connected, unreachable, failed', () => {
  const notConnected = view({ ...base, available: false, reason: 'not_connected' });
  expect(notConnected).toContain('connects Bugfixes');
  expect(notConnected).toContain('Open in Bugfixes'); // the link still works
  expect(view({ ...base, available: false, reason: 'unavailable' })).toContain('can’t be reached');
  expect(view(null, true)).toContain('Couldn&#x27;t load the Bugfixes report');
});

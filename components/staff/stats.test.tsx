import { expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { StatsView } from './stats';
import type { SystemStats } from '@/lib/api';

const c = (total: number, day = 0, week = 0) => ({ total, day, week });
const stats: SystemStats = {
  organizations: c(12, 1, 3), plans: { free: 9, pro: 2, enterprise: 1 }, members: c(1234, 5, 40), projects: c(30),
  boards: c(41), archived_boards: 4, tickets: c(5200, 80, 600), done_tickets: 4100, comments: c(900), attachments: c(77),
  attachment_bytes: 15_400_000, api_keys: { service: 2, ai: 7 }, open_sprints: 11, live_sessions: 1, database_bytes: 2_300_000_000,
};
const html = (s: SystemStats | null, failed = false) => render(<StatsView stats={s} failed={failed} onRetry={() => {}} />).replace(/<!-- -->/g, '');

test('the stat tiles, with what was added in the last day and week (TL-578)', () => {
  const out = html(stats);
  for (const s of ['Organizations', '>12<', '+1 in 24 hours · +3 in 7 days', 'Free 9 · Pro 2 · Enterprise 1', '>1,234<',
    '4 archived', '4,100 done · 1,100 open', '15.4 MB stored', 'ai 7 · service 2', '>9<', '11 open sprints', '1 live sessions', '2.3 GB']) {
    expect(out).toContain(s);
  }
});

test('loading, and a failure that can be retried', () => {
  expect(html(null)).toContain('Loading…');
  const failed = html(null, true);
  expect(failed).toContain('role="alert"');
  expect(failed).toContain('Try again');
});

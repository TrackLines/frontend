import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import type { TicketPR } from '@/lib/api';
import { PullRequestsPanelView } from './pull-requests-panel';

const pr = (over: Partial<TicketPR>): TicketPR => ({
  provider: 'github', repo: '1tn-pw/short-service', number: 155, url: 'https://github.com/1tn-pw/short-service/pull/155',
  title: 'Tester for P1TN-2', state: 'open', author: 'Keloran', branch: 'railway', updated_at: '2026-10-14T23:25:38Z', ...over,
});

test('a ticket shows the pull requests that mention it, linked, with their state (TL-283)', () => {
  const html = renderToStaticMarkup(<PullRequestsPanelView prs={[pr({}), pr({ number: 150, title: 'Earlier go', state: 'merged' })]} />);
  expect(html).toContain('Pull requests');
  expect(html).toContain('1tn-pw/short-service#155');
  expect(html).toContain('Tester for P1TN-2');
  expect(html).toContain('href="https://github.com/1tn-pw/short-service/pull/155"');
  expect(html).toContain('>Open<');
  expect(html).toContain('>Merged<');
  expect(html).toContain('Keloran');
});

test('no pull requests: no panel', () => {
  expect(renderToStaticMarkup(<PullRequestsPanelView prs={[]} />)).toBe('');
});

test('a shipped PR says which release it was in (TL-532)', () => {
  expect(renderToStaticMarkup(<PullRequestsPanelView prs={[pr({ state: 'merged', released_in: 'v1.4.0' })]} />)).toContain('Released in v1.4.0');
  expect(renderToStaticMarkup(<PullRequestsPanelView prs={[pr({ state: 'merged' })]} />)).not.toContain('Released in');
});

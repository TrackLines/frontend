import { expect, test } from 'bun:test';
import { mockDialog } from '@/test/mock-dialog';
import type { Roadmap } from '@/lib/api';

mockDialog();
const { renderToStaticMarkup } = await import('react-dom/server');
const { LoadError } = await import('./load-error');
const { RoadmapRow } = await import('./project/roadmap-row');
const { atProjectLimit, UpgradeDialog } = await import('./billing/upgrade-dialog');
const { ApiError } = await import('@/lib/api');

test('a missing ticket, board or project never says whether it exists in another org', () => {
  const missing = renderToStaticMarkup(<LoadError status={404} thing="board" />);
  expect(missing).toContain('Board not found');
  expect(missing).toContain('belongs to another organization');
  expect(missing).toContain('href="/dashboard"');
  expect(renderToStaticMarkup(<LoadError status={403} thing="roadmap" />)).toContain('Roadmap not found'); // team-only reads as missing
  const failed = renderToStaticMarkup(<LoadError status={500} thing="ticket" />);
  expect(failed).toContain('Couldn&#x27;t load this ticket');
  expect(failed).toContain('Please refresh');
});

test('a roadmap row: visibility, edit (for those who can manage it, TL-413), view and the share link', () => {
  const html = renderToStaticMarkup(<ul><RoadmapRow roadmap={{ id: 'r1', title: 'Q4', visibility: 'login_only' } as Roadmap} canManage /></ul>);
  for (const s of ['Q4', 'href="/roadmaps/r1/edit"', 'href="/r/r1"', 'Copy link']) expect(html).toContain(s);
});

test('the plan’s project limit (402) opens the upgrade offer; other errors don’t', () => {
  expect(atProjectLimit(new ApiError(402, 'limit'))).toBe(true);
  expect(atProjectLimit(new ApiError(500, 'oops'))).toBe(false);
  expect(atProjectLimit(new Error('network'))).toBe(false);
  const html = renderToStaticMarkup(<UpgradeDialog open onOpenChange={() => {}} token="tok" plan={{ plan: 'free', paid: false, project_limit: 1 }} />);
  for (const s of ['Your organization’s Free plan includes 1 project', '>Upgrade to Pro<', 'Not now']) expect(html).toContain(s);
});


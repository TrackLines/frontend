import { expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { PlannedBadge } from './planned-badge';
import { BacklogRow } from '@/components/project/backlog';
import { DashboardWorkView } from '@/components/work/dashboard-work';
import type { BacklogTicket, TicketSearchResult } from '@/lib/api';

// TL-582: a backlog ticket planned into an upcoming sprint says which.
test('the badge: sprint and board, sprint alone, or nothing when unplanned', () => {
  expect(render(<PlannedBadge ticket={{ planned_sprint_number: 6, planned_board_name: 'Backend' }} />)).toContain('Sprint 6 · Backend');
  expect(render(<PlannedBadge ticket={{ planned_sprint_number: 6, planned_board_name: 'Backend' }} />)).toContain('title="Planned into sprint 6 on Backend"');
  expect(render(<PlannedBadge ticket={{ planned_sprint_number: 7 }} />)).toContain('Sprint 7');
  expect(render(<PlannedBadge ticket={{ planned_sprint_number: null }} />)).toBe('');
  expect(render(<PlannedBadge ticket={{}} />)).toBe('');
});

test('it shows on backlog rows and in My work', () => {
  const tk = { id: 't1', key: 'TL-5', title: 'Plan me', type: 'task', labels: [], planned_sprint_number: 6, planned_board_name: 'Backend' } as unknown as BacklogTicket;
  expect(render(<BacklogRow t={tk} busy={false} onEdit={() => {}} />)).toContain('Sprint 6 · Backend');
  expect(render(<BacklogRow t={{ ...tk, planned_sprint_number: null }} busy={false} onEdit={() => {}} />)).not.toContain('Sprint 6');
  const mine = { ...tk, column_id: null, column_name: null, project_name: 'TrackLines', priority: 'medium', blocked: false, done: false, snippet: '' } as unknown as TicketSearchResult;
  expect(render(<DashboardWorkView assigned={[mine]} created={[]} mentioned={[]} people={[]} />)).toContain('Sprint 6 · Backend');
});

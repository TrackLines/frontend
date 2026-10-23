import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import type { IntakeSubmission } from '@/lib/api';
import { TriageView } from './triage';

const s = (over: Partial<IntakeSubmission>): IntakeSubmission => ({
  id: 's1', project_id: 'p', type: 'bug', title: 'Save does nothing', details: 'On Safari\n<script>alert(1)</script>', contact: 'sam@example.com',
  status: 'pending', ticket_id: null, ticket_key: null, decided_by: null, decided_at: null, created_at: '2026-10-11T20:00:00Z', ...over,
});
const view = (props: Partial<Parameters<typeof TriageView>[0]>) => renderToStaticMarkup(
  <TriageView items={[]} status="pending" error="" busy={null} onPromote={() => {}} onDismiss={() => {}} {...props} />,
);

test('waiting requests show type, text, contact and when, with Add to backlog and Dismiss', () => {
  const html = view({ items: [s({})] });
  for (const x of ['Save does nothing', 'On Safari', 'sam@example.com', 'Received', 'Add to backlog', 'Dismiss']) expect(html).toContain(x);
  expect(html).not.toContain('<script>'); // public text stays text
});

test('added and dismissed ones show what happened, without actions', () => {
  const added = view({ status: 'promoted', items: [s({ status: 'promoted', ticket_key: 'TL-160', decided_at: '2026-10-11T21:00:00Z' })] });
  expect(added).toContain('href="/tickets/TL-160"');
  expect(added).not.toContain('Add to backlog');
  expect(view({ status: 'dismissed', items: [s({ status: 'dismissed', decided_at: '2026-10-11T21:00:00Z' })] })).toContain('Dismissed');
});

test('loading, empty, error and no access', () => {
  expect(view({ items: null })).toContain('Loading requests');
  expect(view({})).toContain('No requests waiting');
  expect(view({ items: null, error: 'You don’t have access to this project’s requests.' })).toContain('don’t have access');
  expect(view({ items: [s({})], error: 'Someone has already dealt with that request.' })).toContain('already dealt with');
});

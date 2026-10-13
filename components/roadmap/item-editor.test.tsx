import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ItemEditor, moveDraft, toDrafts, toPayload } from './item-editor';
import type { RoadmapItem } from '@/lib/api';

const items: RoadmapItem[] = [
  { id: 'a', title: 'Invite', description: 'd', target_date: '2026-11-01', position: 0, tickets: [] },
  { id: 'b', title: 'Billing', description: '', target_date: null, position: 1, manual_status: 'done' },
];

test('moving swaps neighbours and stops at the ends', () => {
  expect(moveDraft(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  expect(moveDraft(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
  const list = ['a', 'b'];
  expect(moveDraft(list, 0, -1)).toBe(list);
  expect(moveDraft(list, 1, 1)).toBe(list);
});

test('saving keeps ids (and their linked tickets), trims text and sends empty dates as null', () => {
  const drafts = toDrafts(items);
  expect(drafts[0].manual_status).toBe('not_started');
  drafts[1] = { ...drafts[1], title: '  Billing v2  ', description: ' notes ', start_date: '' };
  drafts.push({ key: 'new-1', title: 'New', description: '', target_date: '', manual_status: 'in_progress' });
  expect(toPayload(drafts)).toEqual([
    { id: 'a', title: 'Invite', description: 'd', target_date: '2026-11-01', start_date: null, manual_status: 'not_started' },
    { id: 'b', title: 'Billing v2', description: 'notes', target_date: null, start_date: null, manual_status: 'done' },
    { id: 'new-1', title: 'New', description: '', target_date: null, start_date: null, manual_status: 'in_progress' },
  ]);
});

test('each milestone can be moved, removed, dated and linked to tickets', () => {
  const html = renderToStaticMarkup(<ItemEditor roadmapId="r" projectId="p" items={items} token="tok" />);
  for (const s of ['Milestone 1', 'Milestone 2', 'value="Invite"', 'Start date', 'Target date', 'Manual status', 'Save items', 'Add item']) expect(html).toContain(s);
  const button = (label: string) => html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? '';
  expect(button('Move milestone 1 up')).toContain('disabled=""');
  expect(button('Move milestone 2 down')).toContain('disabled=""');
  expect(button('Move milestone 1 down')).not.toContain('disabled=""');
  expect(renderToStaticMarkup(<ItemEditor roadmapId="r" projectId="p" items={[]} token="tok" />)).toContain('No milestones yet');
});

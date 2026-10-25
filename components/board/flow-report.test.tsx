import { expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { FlowReport } from './flow-report';
import { FlowDonuts } from './flow-charts';
import { flowFile, flowRange } from '@/lib/flow';
import type { Board, BoardFlow } from '@/lib/api';

const board = { id: 'b1', name: 'Web Ops', project_id: 'p1', style: 'kanban', columns: [] } as unknown as Board;
const flow: BoardFlow = {
  weeks: 12, median_cycle_days: 2, p85_cycle_days: 5.4,
  tickets: [{ id: 't1', key: 'TL-1', title: 'A', started_at: '2026-10-01T00:00:00Z', done_at: '2026-10-03T00:00:00Z', cycle_days: 2 }],
  throughput: [{ week_start: '2026-08-03', tickets: 0 }, { week_start: '2026-09-28', tickets: 1, median_cycle_days: 2, p85_cycle_days: 2 }],
  wip: [{ column_id: 'c1', column: 'To do', tickets: 3 }, { column_id: 'c2', column: 'In progress', tickets: 1 }, { column_id: 'c3', column: 'Review', tickets: 0 }],
  mix: [{ type: 'bug', tickets: 1 }],
};

test('the flow report: a print cover, headlines, every chart and the Export menu (TL-622)', () => {
  const html = render(<FlowReport board={board} flow={flow} token="t" />);
  for (const s of ['Flow report', 'Web Ops', 'Tickets done', 'Median cycle time', '2.0 days', '85th percentile', '5.4 days', 'Weekly throughput', 'Cycle time', 'aria-label="Open by column"', 'aria-label="Done by type"', '>Export<']) expect(html).toContain(s);
  expect(html).toContain('print:flex'); // the cover is print only
  expect(html).toContain('2026-08-03 to'); // the period starts with the first week
});

test('donuts: open tickets by column (empty columns left out) and done by type', () => {
  const html = render(<FlowDonuts flow={flow} />);
  expect(html).toContain('3 (75%)'); // To do
  expect(html).toContain('1 (25%)'); // In progress
  expect(html).not.toContain('Review'); // 0 open
  expect(html).toContain('Bugs');
  expect(render(<FlowDonuts flow={{ ...flow, wip: undefined, mix: [] }} />)).not.toContain('aria-label'); // nothing to draw
});

test('nothing done yet: says so instead of empty charts', () => {
  const html = render(<FlowReport board={board} flow={{ ...flow, tickets: [], median_cycle_days: null, p85_cycle_days: null }} token="t" />);
  expect(html).toContain('No tickets have been completed in this period yet.');
  expect(html).not.toContain('Weekly throughput');
});

test('the Markdown file and period are named like the server names them', () => {
  expect(flowFile('Web Ops: "A"', '2026-10-25')).toBe('web-ops-a-flow-2026-10-25.md');
  expect(flowRange(flow).from).toBe('2026-08-03');
});

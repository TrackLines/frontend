import type { BoardFlow } from './api';

export type FlowChartState = 'empty' | 'cycle-time-unavailable' | 'charts';

export function flowChartState(flow: BoardFlow): FlowChartState {
  if (flow.tickets.length === 0) return 'empty';
  if (!flow.tickets.some((ticket) => ticket.cycle_days !== null)) return 'cycle-time-unavailable';
  return 'charts';
}

export function cycleTimePoints(flow: BoardFlow) {
  return flow.tickets.flatMap((ticket) => ticket.cycle_days === null ? [] : [{
    at: Date.parse(ticket.done_at), days: ticket.cycle_days, key: ticket.key, title: ticket.title,
  }]);
}

// flowRange: the report's period, first week's Monday to today (TL-622).
export function flowRange(flow: BoardFlow): { from: string; to: string } {
  return { from: flow.throughput[0]?.week_start ?? '', to: new Date().toLocaleDateString('en-CA') };
}

// flowFile: the Markdown download's name, as the server names it: "web-flow-2026-10-25.md".
export function flowFile(board: string, day = new Date().toLocaleDateString('en-CA')): string {
  const slug = board.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'report';
  return `${slug}-flow-${day}.md`;
}

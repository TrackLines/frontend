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

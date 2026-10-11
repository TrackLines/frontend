import type { BoardLiveEvent, LiveStandup } from './api';

export type LiveViewState = { standup: LiveStandup | null; refinementRevision: number };

// Refinement events invalidate the existing server-computed plan lists. Standup events carry the
// complete session so every connected board applies the same timer and turn state.
export function applyLiveEvent(state: LiveViewState, event: BoardLiveEvent): LiveViewState {
  if (event.type === 'standup-ended') return { ...state, standup: null };
  if (event.type === 'standup' && isStandup(event.payload)) return { ...state, standup: event.payload };
  if (event.type === 'refinement') return { ...state, refinementRevision: state.refinementRevision + 1 };
  return state;
}

function isStandup(value: unknown): value is LiveStandup {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<LiveStandup>;
  return Array.isArray(session.people) && Number.isInteger(session.index) && Number.isFinite(session.spentMs)
    && (session.runningSince === null || Number.isFinite(session.runningSince))
    && typeof session.startedBy === 'string';
}

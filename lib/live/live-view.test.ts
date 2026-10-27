import { expect, test } from 'bun:test';
import { applyLiveEvent, type LiveViewState } from './live-view';
import type { LiveStandup } from '../api';

const initial: LiveViewState = { standup: null, refinementRevision: 0 };
const session: LiveStandup = {
  people: [{ id: 'u1', label: 'Ava' }], index: 0, spentMs: 200, runningSince: 1_000, startedBy: 'u1',
};

test('live standup event replaces the session with shared state', () => {
  expect(applyLiveEvent(initial, { id: 1, type: 'standup', payload: session })).toEqual({ ...initial, standup: session });
});

test('standup-ended clears the shared panel state', () => {
  expect(applyLiveEvent({ ...initial, standup: session }, { id: 2, type: 'standup-ended' })).toEqual(initial);
});

test('refinement events request a fresh server-computed plan view', () => {
  const next = applyLiveEvent(initial, { id: 3, type: 'refinement', payload: { action: 'approve' } });
  expect(next).toEqual({ ...initial, refinementRevision: 1 });
});

test('unknown or malformed standup events leave state intact', () => {
  expect(applyLiveEvent(initial, { id: 4, type: 'standup', payload: { index: 'bad' } })).toBe(initial);
  expect(applyLiveEvent(initial, { id: 5, type: 'other' })).toBe(initial);
});

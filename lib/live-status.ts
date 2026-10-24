import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { ApiError } from './api';

// The state of a live-updates connection (refinement, standup), in words people understand (TL-222).
export type LiveState = 'connecting' | 'live' | 'reconnecting' | 'unavailable';

// translate at render: i18n._(LIVE_LABEL[state].text)
export const LIVE_LABEL: Record<LiveState, { text: MessageDescriptor; hint: MessageDescriptor }> = {
  connecting: { text: msg`Connecting to live updates…`, hint: msg`Getting ready to show changes others make as they happen.` },
  live: { text: msg`Live updates`, hint: msg`Changes others make appear here as they happen.` },
  reconnecting: { text: msg`Reconnecting…`, hint: msg`Live updates dropped; changes from others will appear when they’re back.` },
  unavailable: { text: msg`Live updates unavailable`, hint: msg`Refresh to see changes others have made.` },
};

// dropped: the state after a connection ends: unavailable when the server says live views are off
// (503), reconnecting once it had been live, still connecting if it never got there.
export function dropped(prev: LiveState, err?: unknown): LiveState {
  if (err instanceof ApiError && err.status === 503) return 'unavailable';
  return prev === 'connecting' ? 'connecting' : 'reconnecting';
}

// combined: one state for several connections (refinement opens one per sprint board).
export function combined(states: LiveState[]): LiveState {
  if (states.length === 0) return 'connecting';
  if (states.includes('unavailable')) return 'unavailable';
  if (states.every((s) => s === 'live')) return 'live';
  return states.includes('reconnecting') ? 'reconnecting' : 'connecting';
}

import { expect, test } from 'bun:test';
import { ApiError } from './api';
import { combined, dropped, LIVE_LABEL } from './live-status';
import { liveToast } from '@/components/live-toast';

test('a drop reads as reconnecting once it had been live, still connecting before, unavailable on 503', () => {
  expect(dropped('live')).toBe('reconnecting');
  expect(dropped('live', new Error('network'))).toBe('reconnecting');
  expect(dropped('connecting', new Error('network'))).toBe('connecting');
  expect(dropped('live', new ApiError(503, 'live sessions unavailable'))).toBe('unavailable');
  expect(dropped('connecting', new ApiError(503, ''))).toBe('unavailable');
});

test('several boards read as one: live only when all are, unavailable if any is', () => {
  expect(combined(['live', 'live'])).toBe('live');
  expect(combined(['live', 'connecting'])).toBe('connecting');
  expect(combined(['live', 'reconnecting'])).toBe('reconnecting');
  expect(combined(['live', 'unavailable', 'reconnecting'])).toBe('unavailable');
  expect(combined([])).toBe('connecting');
});

test('the live toast says what the connection is doing: loading while connecting, a tick when live, a warning when unavailable', () => {
  expect(liveToast('connecting')).toEqual({ kind: 'loading', text: 'Connecting to live updates…', hint: LIVE_LABEL.connecting.hint });
  expect(liveToast('reconnecting').kind).toBe('loading');
  expect(liveToast('live')).toEqual({ kind: 'success', text: 'Live updates', hint: LIVE_LABEL.live.hint });
  expect(liveToast('unavailable').kind).toBe('warning');
  expect(liveToast('unavailable').hint).toContain('Refresh to see changes');
});

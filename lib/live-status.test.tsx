import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiError } from './api';
import { combined, dropped, LIVE_LABEL } from './live-status';
import { LiveBadge } from '@/components/live-badge';

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

test('the badge says what the connection is for, with a hover note', () => {
  expect(renderToStaticMarkup(<LiveBadge state="connecting" />)).toContain('Connecting to live updates…');
  const live = renderToStaticMarkup(<LiveBadge state="live" />);
  expect(live).toContain('>Live<');
  expect(live).toContain(`title="${LIVE_LABEL.live.hint}"`);
  expect(renderToStaticMarkup(<LiveBadge state="unavailable" />)).toContain('Refresh to see changes');
});

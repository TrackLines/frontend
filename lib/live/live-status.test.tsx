import { expect, test } from 'bun:test';
import { ApiError } from '../api';
import { i18nFor } from '../i18n';
import { combined, dropped, LIVE_LABEL } from './live-status';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { LivePill } from '@/components/live/live-toast';

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

test('the live pill is a dot and a few words, with what it means on hover', () => {
  const live = renderToStaticMarkup(<LivePill state="live" />);
  expect(live).toContain('>Live updates<');
  expect(live).toContain(`title="${i18nFor('en')._(LIVE_LABEL.live.hint)}"`);
  expect(live).toContain('bg-emerald-500');
  expect(renderToStaticMarkup(<LivePill state="connecting" />)).toContain('Connecting to live updates…');
  expect(renderToStaticMarkup(<LivePill state="reconnecting" />)).toContain('animate-pulse');
  expect(renderToStaticMarkup(<LivePill state="unavailable" />)).toContain('Refresh to see changes');
});

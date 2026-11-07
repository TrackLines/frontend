import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { PriorityBadge } from './priority-badge';
import { EstimateBadge } from './estimate';

test('the ticket header says what priority and estimate mean, on hover and to screen readers (TL-850)', () => {
  const low = renderToStaticMarkup(<PriorityBadge priority="low" explain />);
  expect(low).toContain('aria-label="Priority: Low"');
  expect(low).toContain('tabindex="0"'); // keyboard focus opens the card too
  expect(low).toContain('>Low<');
  expect(renderToStaticMarkup(<EstimateBadge estimate="3" scale="fibonacci" explain />)).toContain('aria-label="Estimate: 3 points"');
  expect(renderToStaticMarkup(<EstimateBadge estimate="M" scale="tshirt" explain />)).toContain('aria-label="Estimate: size M"');
  expect(renderToStaticMarkup(<EstimateBadge estimate="5" explain />)).toContain('aria-label="Estimate: 5 points"'); // scale unknown (board panel)
});

test('board cards keep the plain badges: the card is the link (TL-850)', () => {
  expect(renderToStaticMarkup(<PriorityBadge priority="high" />)).not.toContain('tabindex');
  expect(renderToStaticMarkup(<EstimateBadge estimate="3" />)).toContain('aria-label="Estimate 3"');
  expect(renderToStaticMarkup(<PriorityBadge priority="medium" hideDefault explain />)).toBe('');
});

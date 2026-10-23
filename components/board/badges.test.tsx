import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { PriorityBadge } from './priority-badge';
import { EstimateBadge } from './estimate';
import { LabelFilterClear } from './label-filter-clear';
import { BlockedBadge } from '@/components/ticket/blocked-badge';

test('priority badges: every level labelled, medium hidden on cards, unknown shown as is', () => {
  for (const [p, label] of [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['urgent', 'Urgent']]) expect(renderToStaticMarkup(<PriorityBadge priority={p} />)).toContain(`>${label}<`);
  expect(renderToStaticMarkup(<PriorityBadge priority="medium" hideDefault />)).toBe('');
  expect(renderToStaticMarkup(<PriorityBadge priority={null} />)).toBe('');
  expect(renderToStaticMarkup(<PriorityBadge priority="critical" />)).toContain('>critical<');
  expect(renderToStaticMarkup(<PriorityBadge priority="urgent" />)).toContain('text-destructive');
});

test('blocked, estimate and the label-filter clear button', () => {
  const blocked = renderToStaticMarkup(<BlockedBadge />);
  expect(blocked).toContain('Blocked');
  expect(blocked).toContain('Waiting on tickets that aren&#x27;t done yet');
  expect(renderToStaticMarkup(<EstimateBadge estimate="5" />)).toContain('aria-label="Estimate 5"');
  expect(renderToStaticMarkup(<EstimateBadge estimate={null} />)).toBe('');
  expect(renderToStaticMarkup(<LabelFilterClear onClick={() => {}} />)).toContain('aria-label="Clear label filter"');
});

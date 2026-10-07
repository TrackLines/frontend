import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TicketLabels } from './labels';
import { addLabels, normalizeLabels, removeLabel } from '@/lib/labels';

test('ticket label chips render as outlined, truncated badges', () => {
  const html = renderToStaticMarkup(<TicketLabels labels={['frontend', 'agent:checkout-api']} />);
  expect(html).toContain('aria-label="Ticket labels"');
  expect(html).toContain('data-variant="outline"');
  expect(html).toContain('frontend');
  expect(html).toContain('agent:checkout-api');
  expect(renderToStaticMarkup(<TicketLabels labels={[]} />)).toBe('');
});

test('label editor helpers trim, dedupe case-insensitively, add and remove labels', () => {
  expect(normalizeLabels([' Frontend ', 'frontend', '', 'backend'])).toEqual(['Frontend', 'backend']);
  expect(addLabels(['frontend'], ' Backend, frontend, qa ')).toEqual({ labels: ['frontend', 'Backend', 'qa'] });
  expect(removeLabel(['Frontend', 'backend'], 'frontend')).toEqual(['backend']);
});

test('label editor helpers enforce backend limits', () => {
  expect(addLabels([], 'x'.repeat(51)).error).toContain('50 characters');
  expect(addLabels(Array.from({ length: 20 }, (_, i) => `label-${i}`), 'extra').error).toContain('at most 20');
});

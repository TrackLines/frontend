import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { i18nFor } from '@/lib/i18n';
import { LabelDrawer, TicketLabels } from './labels';
import { addLabels, normalizeLabels, removeLabel } from '@/lib/ticket/labels';

test('ticket label chips render as outlined, truncated badges', () => {
  const html = renderToStaticMarkup(<TicketLabels labels={['frontend', 'agent:checkout-api']} />);
  expect(html).toContain('aria-label="Ticket labels"');
  expect(html).toContain('data-variant="outline"');
  expect(html).toContain('frontend');
  expect(html).toContain('agent:checkout-api');
  expect(renderToStaticMarkup(<TicketLabels labels={[]} />)).toBe('');
});

test('label editor stays hidden behind the add labels button', () => {
  const html = renderToStaticMarkup(<LabelDrawer projectId="project-1" token="token" labels={[]} onChange={() => {}} />);
  expect(html).toContain('Add labels');
  expect(html).not.toContain('Add a label');
  expect(html).not.toContain('Suggested labels');
});

test('label editor helpers trim, dedupe case-insensitively, add and remove labels', () => {
  expect(normalizeLabels([' Frontend ', 'frontend', '', 'backend'])).toEqual(['Frontend', 'backend']);
  expect(addLabels(i18nFor('en'), ['frontend'], ' Backend, frontend, qa ')).toEqual({ labels: ['frontend', 'Backend', 'qa'] });
  expect(removeLabel(['Frontend', 'backend'], 'frontend')).toEqual(['backend']);
});

test('label editor helpers enforce backend limits', () => {
  expect(addLabels(i18nFor('en'), [], 'x'.repeat(51)).error).toContain('50 characters');
  expect(addLabels(i18nFor('en'), Array.from({ length: 20 }, (_, i) => `label-${i}`), 'extra').error).toContain('at most 20');
});

test('lists show two labels; the rest go behind a +N dropdown', () => {
  const html = renderToStaticMarkup(<TicketLabels labels={['backend', 'frontend', 'refinement', 'standup']} max={2} />);
  expect(html).toContain('>backend<');
  expect(html).toContain('>frontend<');
  expect(html).not.toContain('>refinement<'); // inside the closed dropdown
  expect(html).toContain('+2');
  expect(html).toContain('aria-label="2 more labels: refinement, standup"');
  // two or fewer, or no max (detail views): everything shows, no dropdown
  expect(renderToStaticMarkup(<TicketLabels labels={['a', 'b']} max={2} />)).not.toContain('more labels');
  expect(renderToStaticMarkup(<TicketLabels labels={['a', 'b', 'c']} />)).toContain('>c<');
});

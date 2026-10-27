import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { TicketCard } from '../board/ticket-card';
import { i18nFor } from '@/lib/i18n';
import { formatTimebox, pickerTypes, TimeboxBadge, TypeBadge, TypePicker } from './ticket-type';

const base = { id: 't', column_id: 'c', title: 'Crash on save', description: '', position: 0, created_by: 'test' };

test('card shows a badge for bugs and features, not tasks', () => {
  const card = (type: 'bug' | 'feature' | 'task') =>
    renderToStaticMarkup(<TicketCard ticket={{ ...base, type }} token="x" onUpdated={() => {}} onDeleted={() => {}} />);
  expect(card('bug')).toContain('data-slot="badge"');
  expect(card('bug')).toContain('>bug<');
  expect(card('feature')).toContain('>feature<');
  expect(card('task')).not.toContain('data-slot="badge"');
});

test('picker is a dropdown showing the current type', () => {
  const html = renderToStaticMarkup(<TypePicker value="feature" onChange={() => {}} />);
  expect(html).toContain('Type');
  expect(html).toContain('>Feature<'); // the label, not the raw value
  expect(html).not.toContain('type="radio"');
});

test('spike has a badge and is offered by the picker, unlike epic (TL-502)', () => {
  expect(renderToStaticMarkup(<TypeBadge type="spike" />)).toContain('>spike<');
  const values = (epic: boolean) => pickerTypes('task', epic).map((t) => t.value);
  expect(values(true)).toContain('spike');
  expect(values(false)).toContain('spike'); // still offered when epics are not (e.g. creating on a board)
  expect(values(false)).not.toContain('epic');
});

test('formatTimebox renders days and hours, omitting zero parts (TL-502)', () => {
  expect(formatTimebox(i18nFor('en'), 1, 4)).toBe('1d 4h');
  expect(formatTimebox(i18nFor('en'), 2, 0)).toBe('2d');
  expect(formatTimebox(i18nFor('en'), 0, 6)).toBe('6h');
  expect(formatTimebox(i18nFor('en'), 0, 0)).toBe('');
  expect(formatTimebox(i18nFor('en'), null, null)).toBe('');
});

test('TimeboxBadge shows a set timebox and nothing when unset (TL-502)', () => {
  expect(renderToStaticMarkup(<TimeboxBadge days={1} hours={4} />)).toContain('timebox 1d 4h');
  expect(renderToStaticMarkup(<TimeboxBadge days={null} hours={null} />)).toBe('');
});

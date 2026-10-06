import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TicketCard } from './board/ticket-card';
import { TypePicker } from './ticket-type';

const base = { id: 't', column_id: 'c', title: 'Crash on save', description: '', position: 0, created_by: 'test' };

test('card shows a badge for bugs and features, not tasks', () => {
  const card = (type: 'bug' | 'feature' | 'task') =>
    renderToStaticMarkup(<TicketCard ticket={{ ...base, type }} token="x" onUpdated={() => {}} onDeleted={() => {}} />);
  expect(card('bug')).toContain('data-slot="badge"');
  expect(card('bug')).toContain('>bug<');
  expect(card('feature')).toContain('>feature<');
  expect(card('task')).not.toContain('data-slot="badge"');
});

test('picker marks the current type', () => {
  const html = renderToStaticMarkup(<TypePicker value="feature" onChange={() => {}} />);
  const input = (v: string) => html.match(new RegExp(`<input[^>]*value="${v}"[^>]*>`))![0];
  expect(input('feature')).toContain('checked=""');
  expect(input('bug')).not.toContain('checked');
});

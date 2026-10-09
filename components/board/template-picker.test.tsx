import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemplatePicker, templateSummary } from './template-picker';

test('summary lists columns in order with WIP limits', () => {
  expect(templateSummary({
    id: 'builtin:kanban', name: 'Kanban', builtin: true, style: 'kanban', estimate_scale: 'none',
    columns: [{ name: 'Ready', wip_limit: null }, { name: 'In progress', wip_limit: 3 }, { name: 'Done', wip_limit: null }],
  })).toBe('Ready → In progress (WIP 3) → Done');
});

test('picker is disabled until templates load', () => {
  const html = renderToStaticMarkup(<TemplatePicker value="builtin:simple" onChange={() => {}} token="x" />);
  expect(html).toContain('aria-label="Board template"');
  expect(html).toContain('disabled');
});

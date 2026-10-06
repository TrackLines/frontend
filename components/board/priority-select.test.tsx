import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrioritySelect } from './priority-select';

test('trigger shows the label, not the raw value', () => {
  expect(renderToStaticMarkup(<PrioritySelect value="medium" onChange={() => {}} />)).toContain('>Medium<');
  expect(renderToStaticMarkup(<PrioritySelect value="" onChange={() => {}} />)).toContain('Set priority…');
});

import { expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { Donut, slices } from './donut';

test('a donut leaves out empty slices, and draws nothing when they all are (TL-619)', () => {
  expect(slices([{ key: 'a', label: 'A', value: 0 }, { key: 'b', label: 'B', value: 2 }])).toEqual([{ key: 'b', label: 'B', value: 2 }]);
  expect(render(<Donut title="Mix" note="n" data={[{ key: 'a', label: 'A', value: 0 }]} />)).toBe('');
  const html = render(<Donut title="Mix" note="What got done." data={[{ key: 'a', label: 'Bugs', value: 3 }, { key: 'b', label: 'Features', value: 1 }]} />);
  for (const s of ['aria-label="Mix"', 'Bugs', '3 (75%)', 'Features', '1 (25%)', 'What got done.']) expect(html).toContain(s);
});

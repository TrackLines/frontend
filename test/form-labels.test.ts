import { expect, test } from 'bun:test';
import { Glob } from 'bun';

// A grid label lays out each child as a row, so "Details <span>(optional)</span>" put "(optional)" on a
// line of its own and pushed that field's input out of line with its neighbours. Wrap the label text and
// its hint in one <span>.
test('grid labels keep "(optional)" on the label line', async () => {
  const bad: string[] = [];
  for (const file of new Glob('{app,components}/**/*.tsx').scanSync('.')) {
    const lines = (await Bun.file(file).text()).split('\n');
    lines.forEach((line, i) => {
      if (i > 0 && lines[i - 1].includes('<label className="grid') && /^\s*[A-Za-z][^<]*<span[^>]*>\(optional\)/.test(line)) bad.push(`${file}:${i + 1}`);
    });
  }
  expect(bad).toEqual([]);
});

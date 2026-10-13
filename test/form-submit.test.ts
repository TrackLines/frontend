import { expect, test } from 'bun:test';
import { Glob } from 'bun';

// shadcn's Button here is Base UI's, which renders type="button" unless told otherwise, so a form
// whose button isn't type="submit" silently never submits (Send invite did nothing, TL-238).
test('every form with onSubmit has a type="submit" button', async () => {
  const broken: string[] = [];
  for await (const file of new Glob('{app,components}/**/*.tsx').scan('.')) {
    if (file.includes('.test.')) continue;
    const src = await Bun.file(file).text();
    for (const m of src.matchAll(/<form\b[^>]*onSubmit/g)) {
      const body = src.slice(m.index, src.indexOf('</form>', m.index));
      if (!body.includes('type="submit"')) broken.push(`${file}:${src.slice(0, m.index).split('\n').length}`);
    }
  }
  expect(broken).toEqual([]);
});

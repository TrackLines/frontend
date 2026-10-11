import { expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// One input model: every multi-line field is components/ui/textarea (MarkdownTextarea where the text
// renders as markdown, with its live preview). A raw <textarea> elsewhere drifts in look and behaviour.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : files(path);
    return path.endsWith('.tsx') && !path.endsWith('.test.tsx') ? [path] : [];
  });
}

test('no raw <textarea> outside components/ui/textarea.tsx', () => {
  const root = join(import.meta.dir, '..');
  const offenders = [...files(join(root, 'app')), ...files(join(root, 'components'))]
    .filter((f) => !f.endsWith(join('components', 'ui', 'textarea.tsx')) && /<textarea\b/.test(readFileSync(f, 'utf8')));
  expect(offenders).toEqual([]);
});

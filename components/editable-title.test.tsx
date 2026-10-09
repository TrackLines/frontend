import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditableTitle } from './editable-title';

const save = async () => {};

test('editable title offers a pencil', () => {
  const html = renderToStaticMarkup(<EditableTitle value="Backend" label="board" editable onSave={save} />);
  expect(html).toContain('>Backend</h1>');
  expect(html).toContain('aria-label="Rename board"');
});

test('read-only title is just the heading', () => {
  const html = renderToStaticMarkup(<EditableTitle value="To do" label="column" as="h2" editable={false} onSave={save} />);
  expect(html).toContain('>To do</h2>');
  expect(html).not.toContain('Rename');
});

import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { MentionTextarea } from './mention-textarea';

test('the mention box is our textarea, announced as autocompleting, closed until @ is typed', () => {
  const html = renderToStaticMarkup(<MentionTextarea token="tok" id="c1" value="hello" onChange={() => {}} rows={3} people={[{ id: 'u', name: 'Ava' }]} />);
  expect(html).toContain('data-slot="textarea"');
  expect(html).toContain('id="c1"');
  expect(html).toContain('aria-autocomplete="list"');
  expect(html).not.toContain('role="listbox"');
  expect(html).not.toContain('aria-expanded');
});

import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CopyButton } from './copy-link';

test('copy button is labelled for screen readers', () => {
  const html = renderToStaticMarkup(<CopyButton value="abc" label="Copy ID" ariaLabel="Copy project ID" />);
  expect(html).toContain('aria-label="Copy project ID"');
  expect(html).toContain('Copy ID');
});

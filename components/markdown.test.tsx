import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown, plainText } from './markdown';

test('renders GitHub-style markdown', () => {
  const html = renderToStaticMarkup(<Markdown>{'**Fix** the `login`\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n[docs](https://example.com)'}</Markdown>);
  for (const s of ['<strong>Fix</strong>', '<code>login</code>', '<li>one</li>', '<table>', '<td>1</td>', 'href="https://example.com"', 'target="_blank"', 'rel="noreferrer noopener"']) {
    expect(html).toContain(s);
  }
});

test('raw HTML in a ticket is never run', () => {
  const html = renderToStaticMarkup(<Markdown>{'<script>alert(1)</script><img src=x onerror="alert(1)">'}</Markdown>);
  expect(html).not.toContain('<script');
  expect(html).not.toContain('<img');
  expect(renderToStaticMarkup(<Markdown>{'[x](javascript:alert(1))'}</Markdown>)).not.toContain('javascript:');
});

test('previews drop the markdown symbols', () => {
  expect(plainText('## Plan\n\n- **Backend:** `search` _first_\n- see [docs](https://x.y)\n\n```\ncode\n```')).toBe('Plan\nBackend: search first\nsee docs');
  expect(plainText('a_b_c stays')).toBe('a_b_c stays');
});

import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { Markdown, MarkdownPreview, MarkdownTextarea, looksLikeMarkdown, ownImage, plainText } from './markdown';

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

test('editors preview only once markdown is in use', () => {
  for (const md of ['**bold**', 'a `code` bit', '# Heading', '- item', '1. first', '[docs](https://x.y)', '> quote', '| a | b |']) {
    expect(looksLikeMarkdown(md)).toBe(true);
  }
  for (const plain of ['Fix the login form', 'cost is 5 * 3', 'see TL-123', '']) expect(looksLikeMarkdown(plain)).toBe(false);
  expect(renderToStaticMarkup(<MarkdownPreview text="plain words" />)).toBe('');
  const html = renderToStaticMarkup(<MarkdownPreview text={'- **one**'} />);
  expect(html).toContain('Preview');
  expect(html).toContain('<strong>one</strong>');
});

test('MarkdownTextarea: the shared input, with the live preview once markdown is used', () => {
  const plain = renderToStaticMarkup(<MarkdownTextarea value="just words" onChange={() => {}} aria-label="Details" />);
  expect(plain).toContain('data-slot="textarea"');
  expect(plain).not.toContain('Preview');
  expect(renderToStaticMarkup(<MarkdownTextarea value="- **done**" onChange={() => {}} />)).toContain('<strong>done</strong>');
});

test('mentions turn on the @ picker; public forms stay plain', () => {
  const on = renderToStaticMarkup(<MarkdownTextarea mentions="tok" value="hi" onChange={() => {}} />);
  expect(on).toContain('aria-autocomplete="list"');
  expect(on).toContain('>hi</textarea>');
  expect(renderToStaticMarkup(<MarkdownTextarea value="hi" onChange={() => {}} />)).not.toContain('aria-autocomplete');
});

test('task lists render as checkboxes, clickable only when ticking can be saved', () => {
  const md = 'Steps:\n\n- [x] one\n- [ ] two';
  const readOnly = renderToStaticMarkup(<Markdown>{md}</Markdown>);
  expect(readOnly.match(/type="checkbox"/g)?.length).toBe(2);
  expect(readOnly.match(/disabled=""/g)?.length).toBe(2);
  expect(readOnly.match(/checked=""/g)?.length).toBe(1);
  const clickable = renderToStaticMarkup(<Markdown onToggleTask={() => {}}>{md}</Markdown>);
  expect(clickable).not.toContain('disabled=""');
  expect(clickable).toContain('aria-label="Not done: click to mark done"');
  expect(clickable).toContain('aria-label="Done: click to mark not done"');
  // each box reports its own line in the source, which is what toggleTask flips
  expect(clickable).toMatch(/data-line="3"[^>]*aria-label="Done/);
  expect(clickable).toMatch(/data-line="4"[^>]*aria-label="Not done/);
  // loose lists (blank lines between items) put the box inside a paragraph: still one box each
  expect(renderToStaticMarkup(<Markdown>{'- [ ] a\n\n- [x] b'}</Markdown>).match(/type="checkbox"/g)?.length).toBe(2);
});

test('images show only from our own uploads; anyone else’s is a link, so it can’t track readers (TL-252)', () => {
  const html = renderToStaticMarkup(<Markdown>{'![shot](https://abc.ufs.sh/f/key) ![pixel](https://attacker.example/p.png?id=1)'}</Markdown>);
  expect(html).toContain('<img src="https://abc.ufs.sh/f/key" alt="shot"');
  expect(html).not.toContain('<img src="https://attacker.example');
  expect(html).toContain('href="https://attacker.example/p.png?id=1"');
  expect(ownImage('https://utfs.io/f/x')).toBe(true);
  expect(ownImage('http://utfs.io/f/x')).toBe(false);
  expect(ownImage('https://ufs.sh.attacker.example/x')).toBe(false);
  expect(ownImage('https://evilufs.sh/x')).toBe(false);
});

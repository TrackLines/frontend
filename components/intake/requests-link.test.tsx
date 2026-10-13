import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { RequestsLinkView } from './requests-link';

test('the Requests link shows while the form is open or requests wait, with how many', () => {
  expect(renderToStaticMarkup(<RequestsLinkView projectId="p" state={null} />)).toBe('');
  expect(renderToStaticMarkup(<RequestsLinkView projectId="p" state={{ open: false, waiting: 0 }} />)).toBe('');
  const open = renderToStaticMarkup(<RequestsLinkView projectId="p" state={{ open: true, waiting: 0 }} />);
  expect(open).toContain('href="/projects/p/requests"');
  expect(open).not.toContain('rounded-full');
  expect(renderToStaticMarkup(<RequestsLinkView projectId="p" state={{ open: false, waiting: 3 }} />)).toMatch(/Requests<span[^>]*>3</);
});

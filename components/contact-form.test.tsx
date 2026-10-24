import { afterEach, expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { ContactForm, sendError } from './contact-form';
import { ApiError, enquiries } from '@/lib/api';
import { Markdown } from './markdown';

test('the contact form asks for name, email and message (company optional), with a hidden honeypot', () => {
  const html = renderToStaticMarkup(<ContactForm sourcePath="/contact" />);
  for (const s of ['name="name"', 'type="email"', 'name="company"', 'name="message"', '>Send message<']) expect(html).toContain(s);
  expect(html.match(/required=""/g)?.length).toBe(3);
  expect(html).toMatch(/name="website"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*name="website"/);
  expect(html).toContain('data-slot="textarea"'); // the shared Textarea, never a raw one
});

test('failures explain themselves', () => {
  expect(sendError(new ApiError(429, ''))).toContain('try again in a minute');
  expect(sendError(new ApiError(400, ''))).toContain('valid email address');
  expect(sendError(new Error('offline'))).toContain('couldn’t send');
});

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('messages are posted to /api/enquiries', async () => {
  const calls: { url: string; body: unknown }[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url: new URL(url, 'http://x').pathname, body: JSON.parse(String(init?.body)) });
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  await enquiries.send({ name: 'Ava', email: 'ava@example.com', message: 'Delete my data', source_path: '/privacy' });
  expect(calls).toEqual([{ url: '/api/enquiries', body: { name: 'Ava', email: 'ava@example.com', message: 'Delete my data', source_path: '/privacy' } }]);
});

test('links within the site open in the same tab; others in a new one', () => {
  const html = renderToStaticMarkup(<Markdown>{'[contact form](/contact) and [ICO](https://ico.org.uk) and [x](//evil.example)'}</Markdown>);
  expect(html).toContain('<a href="/contact">contact form</a>');
  expect(html).toMatch(/href="https:\/\/ico.org.uk" target="_blank"/);
  expect(html).toMatch(/href="\/\/evil.example" target="_blank"/);
});

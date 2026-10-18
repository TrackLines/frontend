import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiError } from '@/lib/api';
import { RequestFormView, sendError } from './request-form';
import { IntakeSettingsView, requestLink } from './intake-settings';

const form = (state: Parameters<typeof RequestFormView>[0]['state']) =>
  renderToStaticMarkup(<RequestFormView state={state} onSend={async () => {}} onAnother={() => {}} />);

test('the public form: bug or feature, title, optional details and contact, a hidden honeypot', () => {
  const html = form('open');
  for (const s of ['Send a request', 'Bug report', 'Feature request', '>Title<', 'Details', 'How can we reach you?', 'Send request']) expect(html).toContain(s);
  expect(html).toMatch(/aria-hidden="true"[^>]*>.*name="website"/);
  expect(html).toMatch(/name="website"[^>]*tabindex="-1"|tabindex="-1"[^>]*name="website"/i);
});

test('loading, closed and sent states never mention the project', () => {
  expect(form('loading')).toContain('Loading');
  expect(form('closed')).toContain('This form is closed');
  expect(form('sent')).toContain('Thanks, we&#x27;ve got it');
  expect(form('sent')).toContain('Send another');
});

test('send errors are actionable: invalid, closed, rate limited', () => {
  expect(sendError(new ApiError(400, ''))).toContain('add a title');
  expect(sendError(new ApiError(404, ''))).toContain('isn’t taking requests');
  expect(sendError(new ApiError(429, ''))).toContain('try again in an hour');
  expect(sendError(new Error('offline'))).toContain('try again');
});

test('settings: closed offers Open; open shows the link to copy, New link and Close', () => {
  const closed = renderToStaticMarkup(<IntakeSettingsView settings={{ open: false, token: null, can_manage: true }} busy={false} error="" onChange={() => {}} />);
  expect(closed).toContain('The form is closed');
  expect(closed).toContain('Open the form');
  const open = renderToStaticMarkup(<IntakeSettingsView settings={{ open: true, token: 'abc123', can_manage: true }} busy={false} error="" onChange={() => {}} origin="https://tracklin.es" />);
  expect(open).toContain('https://tracklin.es/request/abc123');
  for (const s of ['Copy link', 'New link', 'Close the form']) expect(open).toContain(s);
  expect(requestLink('t', 'https://x.y')).toBe('https://x.y/request/t');
});

test('settings: only org admins open, close or reset the form (TL-432); others can still copy the link', () => {
  const closed = renderToStaticMarkup(<IntakeSettingsView settings={{ open: false, token: null, can_manage: false }} busy={false} error="" onChange={() => {}} />);
  expect(closed).toContain('An organization admin can open it');
  expect(closed).not.toContain('Open the form');
  const open = renderToStaticMarkup(<IntakeSettingsView settings={{ open: true, token: 'abc123', can_manage: false }} busy={false} error="" onChange={() => {}} origin="https://tracklin.es" />);
  expect(open).toContain('Copy link');
  expect(open).toContain('Only organization admins');
  for (const s of ['New link', 'Close the form']) expect(open).not.toContain(s);
});

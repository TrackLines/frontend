import { expect, test } from 'bun:test';
import { probe } from './proxy';

const none = new Headers();

test('pages are only read: other methods, and anything else claiming to be a server action, are scanners', () => {
  for (const path of ['/api', '/app', '/RSC/abc.txt', '/dashboard', '/']) expect(probe('POST', path, none)).toBe(true);
  expect(probe('PUT', '/projects/p1', none)).toBe(true);
  expect(probe('GET', '/api/tickets', new Headers({ 'Next-Action': 'x' }))).toBe(true);
  // what the app really does still goes through
  for (const path of ['/', '/dashboard', '/legal-versions.json']) {
    expect(probe('GET', path, none)).toBe(false);
    expect(probe('HEAD', path, none)).toBe(false);
  }
  for (const path of ['/api/tickets/TL-1', '/api/client-errors', '/api/uploadthing', '/__clerk/v1/client']) {
    expect(probe('POST', path, none)).toBe(false);
  }
  expect(probe('DELETE', '/api/tickets/TL-1', none)).toBe(false);
});

test("Clerk's server action gets through, or choosing an org never finishes", () => {
  const action = new Headers({ 'Next-Action': 'x', Accept: 'text/x-component' });
  for (const path of ['/sign-in/tasks/choose-organization', '/dashboard']) expect(probe('POST', path, action)).toBe(false);
  expect(probe('POST', '/dashboard', new Headers({ 'Next-Action': 'x' }))).toBe(true); // no RSC accept: not the browser's call
  expect(probe('GET', '/dashboard', action)).toBe(true);
});

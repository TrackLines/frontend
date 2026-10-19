import { expect, test } from 'bun:test';
import { probe } from './proxy';

const none = new Headers();

test('pages are only read: other methods, and server action calls, are scanners (the app has no actions)', () => {
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

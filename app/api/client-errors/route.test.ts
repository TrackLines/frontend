import { expect, test } from 'bun:test';
import { NextRequest } from 'next/server';
import { POST } from './route';

const post = (body: string | ReadableStream, ip: string) => POST(new NextRequest('https://tracklin.es/api/client-errors', {
  method: 'POST', body, headers: { 'x-forwarded-for': ip }, duplex: 'half',
} as ConstructorParameters<typeof NextRequest>[1]));

test('client error reports: up to 16 KB is taken (204), over is a 413 without reading on (TL-382)', async () => {
  expect((await post('x'.repeat(16_384), '198.51.100.1')).status).toBe(204);
  expect((await post('x'.repeat(16_385), '198.51.100.2')).status).toBe(413);
  let pulled = 0;
  const endless = new ReadableStream({ pull(c) { pulled++; c.enqueue(new Uint8Array(4096)); } });
  expect((await post(endless, '198.51.100.3')).status).toBe(413);
  expect(pulled).toBeLessThan(10);
});

test('the rate limit comes before the body is read', async () => {
  for (let i = 0; i < 10; i++) await post('{}', '198.51.100.9');
  let pulled = 0;
  const body = new ReadableStream({ pull(c) { pulled++; c.enqueue(new Uint8Array(10)); c.close(); } }, { highWaterMark: 0 });
  expect((await post(body, '198.51.100.9')).status).toBe(204);
  expect(pulled).toBe(0);
});

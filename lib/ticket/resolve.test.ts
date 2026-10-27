import { afterEach, expect, test } from 'bun:test';
import { tickets } from '../api';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test("won't do sends the resolution and a trimmed reason; plain resolve is done", async () => {
  const sent: { url: string; body: unknown }[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    sent.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  await tickets.resolve('t1', 'tok', 'wont_do', '  Out of scope  ');
  await tickets.resolve('t2', 'tok');
  expect(sent[0].url).toContain('/tickets/t1/resolve');
  expect(sent[0].body).toEqual({ resolution: 'wont_do', reason: 'Out of scope' });
  expect(sent[1].body).toEqual({ resolution: 'done' });
});

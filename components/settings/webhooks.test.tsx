import { afterEach, expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import { tmpdir } from 'node:os';
import { render } from '@/test/i18n';
import { Deliveries, loadProblem, webhookURL } from './webhooks';
import { WEBHOOK_EVENTS, webhooks, type WebhookDelivery } from '@/lib/api';
import { ERROR_MESSAGES } from '@/lib/api/error-codes';
import WebhooksDocs, { VERIFY_NODE } from '@/app/docs/webhooks/page';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('an endpoint must be an https address with a real host (TL-636)', () => {
  expect(webhookURL(' https://example.com/hooks/tl ')).toBe('https://example.com/hooks/tl');
  for (const bad of ['http://example.com/hook', 'https://localhost/hook', 'ftp://x.y', 'not a url', '']) expect(webhookURL(bad)).toBeNull();
});

test('the client calls the backend contract (TL-635)', async () => {
  const asked: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    asked.push(`${init?.method ?? 'GET'} ${String(url).replace(/^.*\/api/, '')}${init?.body ? ` ${init.body}` : ''}`);
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  await webhooks.list('t');
  await webhooks.create({ url: 'https://x.io/h', events: ['ticket.done'] }, 't');
  await webhooks.update('w1', { enabled: false }, 't');
  await webhooks.rotate('w1', 't');
  await webhooks.test('w1', 't');
  await webhooks.deliveries('w1', 2, 't');
  await webhooks.redeliver('w1', 'd1', 't');
  expect(asked).toEqual([
    'GET /org/webhooks', 'POST /org/webhooks {"url":"https://x.io/h","events":["ticket.done"]}', 'PATCH /org/webhooks/w1 {"enabled":false}',
    'POST /org/webhooks/w1/secret', 'POST /org/webhooks/w1/test', 'GET /org/webhooks/w1/deliveries?page=2', 'POST /org/webhooks/w1/deliveries/d1/redeliver',
  ]);
  for (const code of ['webhooks_plan', 'webhook_limit', 'bad_webhook_url', 'bad_webhook_events']) expect(ERROR_MESSAGES[code]).toBeDefined();
});

const delivery = (o: Partial<WebhookDelivery>): WebhookDelivery => ({
  id: 'd1', event: 'ticket.moved', state: 'ok', attempts: 1, status_code: 200, error: null, duration_ms: 84,
  created_at: '2026-10-25T14:02:00Z', next_attempt_at: null, request_body: '{"event":"ticket.moved"}', response_body: 'thanks', ...o,
});

test('the delivery log: state, status, what was sent and answered, and send again', () => {
  const html = render(<Deliveries endpoint="w1" token="t" initial={[delivery({}), delivery({ id: 'd2', state: 'failed', status_code: 500, error: 'HTTP 500', attempts: 6, response_body: null })]} />);
  for (const s of ['Delivered', 'HTTP 200', '84 ms', 'Failed', 'HTTP 500', 'attempt 6', '{&quot;event&quot;:&quot;ticket.moved&quot;}', 'thanks', 'Send again']) expect(html).toContain(s);
  expect(render(<Deliveries endpoint="w1" token="t" initial={[]} />)).toContain('Nothing sent in the last 30 days.');
});

test('the docs list every event and show how to verify the signature', () => {
  const html = render(<WebhooksDocs />);
  for (const e of WEBHOOK_EVENTS) expect(html).toContain(`<code>${e}</code>`);
  for (const s of ['TrackLines-Signature', '1 minute, 5 minutes, 30 minutes, 2 hours and 12 hours', 'up to 10 webhooks', 'Pro and Enterprise']) expect(html).toContain(s);
});

test('the Node example really verifies a signature made the documented way', async () => {
  const file = `${tmpdir()}/verify-${process.pid}.mjs`;
  await Bun.write(file, VERIFY_NODE);
  const mod = await import(file);
  const body = '{"event":"ping"}', secret = 'whsec_test', t = Math.floor(Date.now() / 1000);
  const v1 = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  expect(mod.verify(`t=${t},v1=${v1}`, body, secret)).toBe(true);
  expect(mod.verify(`t=${t},v1=${v1}`, body + ' ', secret)).toBe(false); // a changed body
  expect(mod.verify(`t=${t - 3600},v1=${createHmac('sha256', secret).update(`${t - 3600}.${body}`).digest('hex')}`, body, secret)).toBe(false); // too old
});

test('the page and its Settings card are behind the webhooks flag and for admins (source)', async () => {
  const read = (p: string) => Bun.file(new URL(p, import.meta.url)).text();
  expect(await read('../../app/settings/webhooks/page.tsx')).toContain("is('webhooks').enabled()");
  expect(await read('../../app/settings/page.tsx')).toContain("{admin && is('webhooks').enabled() && <SettingsCard icon={WebhookIcon}");
});

test('a list that won\'t load says why: off on the backend, or not an admin (TL-641)', async () => {
  expect([404, 403, 500, 0].map(loadProblem)).toEqual(['off', 'admins', 'other', 'other']);
  const src = await Bun.file(new URL('./webhooks.tsx', import.meta.url)).text();
  for (const s of ['Webhooks aren’t turned on for your organization yet.', 'Only organization admins can manage webhooks.', 'Couldn’t load your webhooks (HTTP ${status}).']) expect(src).toContain(s);
});

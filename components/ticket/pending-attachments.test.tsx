import { afterEach, expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { attachAll, PendingAttachments, type PendingFile } from './pending-attachments';

const f = (key: string, name: string): PendingFile => ({ key, url: `https://x.ufs.sh/f/${key}`, name, size: 3 * 1024 * 1024, content_type: 'image/png' });

test('files waiting for the new ticket are listed and can be dropped', () => {
  const html = renderToStaticMarkup(<PendingAttachments files={[f('a', 'shot.png')]} onChange={() => {}} projectId="p" />);
  for (const s of ['shot.png', '3.0 MB', 'Don&#x27;t attach shot.png']) expect(html).toContain(s);
});

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('attachAll records every file on the ticket and counts the failures', async () => {
  const sent: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    sent.push(`${new URL(url, 'http://x').pathname} ${body.key}`);
    return body.key === 'bad' ? new Response('nope', { status: 500 }) : Response.json({ id: body.key });
  }) as typeof fetch;
  expect(await attachAll('t1', [f('a', 'one'), f('bad', 'two')], 'tok')).toBe(1);
  expect(sent.sort()).toEqual(['/api/tickets/t1/attachments a', '/api/tickets/t1/attachments bad']);
});

import { expect, test } from 'bun:test';
import { i18nFor } from '@/lib/i18n';
import { alsoMovesNote } from './ticket-dialog';
import { backlog, tickets } from '@/lib/api';

test('before sending a parent to the backlog, the dialog says which sub-tickets go too (TL-218)', () => {
  expect(alsoMovesNote([], i18nFor('en'))).toBe('');
  expect(alsoMovesNote([{ id: 'a', key: 'TL-5', title: 'a' }], i18nFor('en'))).toBe('Sending it to the backlog also moves its open sub-ticket on this board: TL-5.');
  expect(alsoMovesNote([{ id: 'a', key: 'TL-5', title: 'a' }, { id: 'b', key: null, title: 'untitled key' }], i18nFor('en')))
    .toBe('Sending it to the backlog also moves its 2 open sub-tickets on this board: TL-5, untitled key.');
  const many = Array.from({ length: 7 }, (_, i) => ({ id: `t${i}`, key: `TL-${i}`, title: '' }));
  expect(alsoMovesNote(many, i18nFor('en'))).toContain('TL-0, TL-1, TL-2, TL-3, TL-4 and 2 more.');
});

test('the preview and the send say what moved', async () => {
  const realFetch = globalThis.fetch;
  const asked: string[] = [];
  globalThis.fetch = ((url: string) => {
    asked.push(String(url));
    return Promise.resolve(new Response(String(url).endsWith('/group') ? '[{"id":"s","key":"TL-5","title":"part"}]' : '{"also_moved":[{"id":"s","key":"TL-5","title":"part"}]}'));
  }) as unknown as typeof fetch;
  try {
    expect((await tickets.group('p1', 't'))[0].key).toBe('TL-5');
    expect((await backlog.send('p1', 't'))?.also_moved?.[0].id).toBe('s');
    expect(asked[0]).toContain('/tickets/p1/group');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('the dialog clears the sub-tickets off the board after sending', async () => {
  const src = await Bun.file(new URL('./ticket-dialog.tsx', import.meta.url)).text();
  expect(src).toContain('for (const sub of res?.also_moved ?? []) onSentToBacklog(sub.id)');
});

import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { BoardPreview, SampleSections } from './board-preview';

test('the sample board shows every card, clickable, laid out like the real ones', () => {
  const html = renderToStaticMarkup(<BoardPreview />);
  for (const s of ['SHOP-42', 'SHOP-39', 'SHOP-37', 'SHOP-35', 'SHOP-31', 'Checkout fails on expired cards', 'Unassigned', 'by Bugfixes', 'click a ticket']) expect(html).toContain(s);
  expect(html.match(/<button/g)?.length).toBe(5); // one per card title
});

test('a sample pull request shows like a real one, linking nowhere (SHOP-37)', () => {
  const html = renderToStaticMarkup(<SampleSections s={{ ticket: { id: 'SHOP-2', key: 'SHOP-2', column_id: '', position: 0, title: 't', description: '', created_by: 'Sam' },
    prs: [{ provider: 'github', repo: 'acme/shop', number: 214, url: '', title: 'SHOP-2: a change', state: 'open', author: 'claude', branch: 'b', updated_at: new Date().toISOString() }] }} />);
  for (const want of ['Pull requests', 'acme/shop#214', 'SHOP-2: a change', 'Open', 'claude']) expect(html).toContain(want);
  expect(html).not.toContain('github.com');
  expect(html.indexOf('Attachments')).toBeLessThan(html.indexOf('Pull requests')); // the real modal's order
  expect(html.indexOf('Pull requests')).toBeLessThan(html.indexOf('Conversation'));
});

test('sample details are read-only: no comment box, reply, upload or remove', () => {
  const s = { ticket: { id: 'SHOP-1', key: 'SHOP-1', column_id: '', position: 0, title: 't', description: '', created_by: 'Sam' },
    bugfixes: { source: 'bugfixes' as const, project: 'p', report_id: '1', url: '', available: true, regressed: false,
      report: { title: 'TypeError', occurrences: 37, status: 'open' as const, last_seen: new Date().toISOString(), levels: ['error'], file: 'pay.ts', line: 88 } },
    files: [{ name: 'shot.png', size: 2048, by: 'Sam' }],
    comments: [{ author: 'Sam', hours: 2, body: 'first' }, { author: 'Alex', hours: 1, body: 'a reply', reply: true }] };
  const html = renderToStaticMarkup(<SampleSections s={s} />);
  for (const want of ['TypeError', '37', 'shot.png', '2.0 KB · Sam', 'Conversation', 'first', 'a reply']) expect(html).toContain(want);
  for (const never of ['<textarea', '<input', 'Reply', 'Remove', 'Post comment', 'Open in Bugfixes']) expect(html).not.toContain(never);
});

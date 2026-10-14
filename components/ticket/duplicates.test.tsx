import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DuplicateLinks, MarkDuplicate } from './duplicates';
import type { TicketDetail } from '@/lib/api';

const base = { id: 't', project_id: 'p', blocked_by: [], blocks: [] } as unknown as TicketDetail;

test('a duplicate links to its original (or says it was deleted); an original lists its duplicates', () => {
  expect(renderToStaticMarkup(<DuplicateLinks ticket={base} />)).toBe('');
  const dup = renderToStaticMarkup(<DuplicateLinks ticket={{ ...base, resolution: 'duplicate', duplicate_of_id: 'o', duplicate_of_key: 'TL-2', duplicate_of_title: 'Original' }} />);
  expect(dup).toContain('href="/tickets/o"');
  expect(dup).toContain('Original');
  expect(renderToStaticMarkup(<DuplicateLinks ticket={{ ...base, resolution: 'duplicate' }} />)).toContain('a ticket that has been deleted');
  const orig = renderToStaticMarkup(<DuplicateLinks ticket={{ ...base, duplicates: [{ id: 'd', key: 'TL-9', title: 'Same thing' }] } as TicketDetail} />);
  expect(orig).toContain('Duplicates');
  expect(orig).toContain('TL-9');
});

test('marking as a duplicate waits behind its button, then starts with a search, and is gone once it is one (TL-258)', () => {
  const closed = renderToStaticMarkup(<MarkDuplicate ticket={base} token="tok" onChanged={() => {}} />);
  expect(closed).toContain('>Mark as duplicate…<');
  expect(closed).not.toContain('Find the original ticket'); // not open until asked for
  const html = renderToStaticMarkup(<MarkDuplicate ticket={base} token="tok" onChanged={() => {}} open />);
  expect(html).toContain('Mark as duplicate');
  expect(html).toContain('>Cancel<');
  expect(html).toContain('Find the original ticket');
  expect(html).not.toContain('Copy labels'); // only once an original is chosen
  expect(renderToStaticMarkup(<MarkDuplicate ticket={{ ...base, duplicate_of_id: 'o' }} token="tok" onChanged={() => {}} />)).toBe('');
});

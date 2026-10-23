import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import type { TicketSearchResult } from '@/lib/api';
import { similarQuery, SimilarTickets } from './similar-tickets';

test('similar tickets show while the title is typed, and go once the details are being written', () => {
  const similar = [{ id: 't1', key: 'TL-12', title: 'Login fails on Safari', project_name: 'TrackLines' } as TicketSearchResult];
  const shown = renderToStaticMarkup(<SimilarTickets suggestions={similar} description="" />);
  expect(shown).toContain('Similar tickets in this project');
  expect(shown).toContain('Login fails on Safari');
  expect(renderToStaticMarkup(<SimilarTickets suggestions={similar} description="  " />)).toContain('Login fails on Safari'); // spaces aren't details
  expect(renderToStaticMarkup(<SimilarTickets suggestions={similar} description="It happens after" />)).toBe('');
  expect(renderToStaticMarkup(<SimilarTickets suggestions={[]} description="" />)).toBe('');
});

test('a title searches for similar tickets from its first real word (TL-274)', () => {
  expect(similarQuery('Pagination')).toBe('Pagination'); // one word is enough
  expect(similarQuery('UI tweak')).toBe('tweak');
  expect(similarQuery('Login broken on Safari mobile and desktop')).toBe('Login broken Safari mobile and');
  for (const tooShort of ['', '   ', 'UI', 'a b', 'fix']) expect(similarQuery(tooShort)).toBeNull();
});

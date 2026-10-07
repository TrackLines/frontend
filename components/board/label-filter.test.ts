import { expect, test } from 'bun:test';
import type { Ticket } from '@/lib/api';
import { filterTicketsByLabels } from './label-filter';

const t = (id: string, labels?: string[]) => ({ id, labels }) as Ticket;
const all = [t('a', ['agent:API', 'prod']), t('b', ['ui']), t('c', []), t('d')];

test('no labels selected shows everything', () => {
  expect(filterTicketsByLabels(all, [])).toHaveLength(4);
});

test('matches any selected label, case-insensitively', () => {
  expect(filterTicketsByLabels(all, ['agent:api']).map((x) => x.id)).toEqual(['a']);
  expect(filterTicketsByLabels(all, ['UI', 'prod']).map((x) => x.id)).toEqual(['a', 'b']);
  expect(filterTicketsByLabels(all, ['nope'])).toHaveLength(0);
});

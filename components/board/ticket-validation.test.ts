import { expect, test } from 'bun:test';
import { missingTicketFields } from './ticket-validation';

test('reports every missing required ticket field together', () => {
  expect(missingTicketFields('  ', '', true)).toEqual({ title: true, estimate: true });
});

test('does not require an estimate on unestimated boards', () => {
  expect(missingTicketFields('A ticket', '', false)).toEqual({ title: false, estimate: false });
});

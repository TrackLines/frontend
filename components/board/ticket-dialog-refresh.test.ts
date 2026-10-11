import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// TL-141: the board refreshes every 30s and passes a new copy of the same ticket. The dialog must
// reset its form when it opens or the ticket changes, never on a new copy, or typing is lost.
test('the ticket dialog resets on open or a different ticket, not on every refresh', () => {
  const src = readFileSync(join(import.meta.dir, 'ticket-dialog.tsx'), 'utf8');
  expect(src).toContain('}, [open, ticket?.id]);');
  expect(src).not.toMatch(/\}, \[open, ticket\]\);/);
});

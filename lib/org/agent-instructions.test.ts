import { afterEach, expect, test } from 'bun:test';
import { agentInstructions } from '@/lib/api';
import { ERROR_MESSAGES } from '@/lib/api/error-codes';
import { AGENT_INSTRUCTIONS_MAX, draftState } from './agent-instructions';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

// TL-901: a draft is what would be saved: trimmed, counted in characters, at most 4,000
test('a draft: trimmed, counted like the backend, changed or not, clearing or not', () => {
  expect(AGENT_INSTRUCTIONS_MAX).toBe(4000);
  expect(draftState('', '')).toEqual({ text: '', length: 0, tooLong: false, changed: false, clears: false });
  expect(draftState('  Run the linter.\n', '')).toMatchObject({ text: 'Run the linter.', length: 15, changed: true, clears: false });
  expect(draftState(' Run the linter. ', 'Run the linter.').changed).toBe(false); // only whitespace differs: nothing to save
  expect(draftState(' \n\t ', 'Run the linter.')).toMatchObject({ text: '', changed: true, clears: true }); // whitespace only clears
  expect(draftState('x'.repeat(4000), '').tooLong).toBe(false);
  expect(draftState('x'.repeat(4001), '').tooLong).toBe(true);
  expect(draftState(`  ${'x'.repeat(4000)}  `, '').tooLong).toBe(false); // surrounding whitespace doesn't count
  expect(draftState('😀'.repeat(4000), '')).toMatchObject({ length: 4000, tooLong: false }); // characters, not UTF-16 units
});

test('the client calls the backend contract: load, save, and clear with empty text (TL-899)', async () => {
  const asked: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    asked.push(`${init?.method ?? 'GET'} ${String(url).replace(/^.*\/api/, '')}${init?.body ? ` ${init.body}` : ''}`);
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  await agentInstructions.get('t');
  await agentInstructions.set('Run the linter.', 't');
  await agentInstructions.set('', 't');
  expect(asked).toEqual(['GET /org/mcp-instructions', 'PUT /org/mcp-instructions {"instructions":"Run the linter."}', 'PUT /org/mcp-instructions {"instructions":""}']);
  for (const code of ['admins_mcp_instructions', 'mcp_instructions_too_long']) expect(ERROR_MESSAGES[code]).toBeDefined();
});

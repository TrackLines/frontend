import { expect, test } from 'bun:test';
import { render } from '@/test/i18n';
import { canPublish, MAX_PROMPT, McpPromptHistory } from './mcp-prompt';

// TL-674: publish only real changes; every version listed with its docs page
test('publishing needs text that differs from the current version and fits', () => {
  expect(canPublish('', 'v1')).toBe(false);
  expect(canPublish('   ', 'v1')).toBe(false);
  expect(canPublish(' v1 \n', 'v1')).toBe(false); // unchanged
  expect(canPublish('v2', 'v1')).toBe(true);
  expect(canPublish('v1', undefined)).toBe(true); // nothing published yet
  expect(canPublish('x'.repeat(MAX_PROMPT + 1), 'v1')).toBe(false);
});

test('the history: version, date, who and what changed, each linking to its docs page', () => {
  const html = render(<McpPromptHistory versions={[
    { version: 2, note: 'clearer', published_at: '2026-10-27T20:00:00Z', published_by: 'user_staff' },
    { version: 1, note: '', published_at: '2026-10-01T09:00:00Z', published_by: 'TrackLin.es' },
  ]} />);
  expect(html).toContain('href="/docs/mcp/versions/2"');
  expect(html).toContain('href="/docs/mcp/versions/1"');
  expect(html).toContain('clearer');
  expect(html).toContain('user_staff');
  expect(render(<McpPromptHistory versions={[]} />)).toBe('');
});

test('the staff panel has an MCP pre-prompt tab (source)', async () => {
  const shell = await Bun.file(new URL('./staff-shell.tsx', import.meta.url)).text();
  expect(shell).toContain("{ id: 'mcp-prompt', label: <Trans>MCP pre-prompt</Trans> }");
  const page = await Bun.file(new URL('../../app/staff/mcp-prompt/page.tsx', import.meta.url)).text();
  expect(page).toContain('<StaffShell tab="mcp-prompt"><McpPromptEditor /></StaffShell>');
});

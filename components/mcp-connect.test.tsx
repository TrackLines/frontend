import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { AGENTS, MCP_URL, McpInstructions } from './mcp-connect';

test('every agent tab points at the MCP endpoint with a bearer key', () => {
  for (const a of AGENTS) {
    const code = a.steps.map((s) => s.code ?? '').join('\n');
    expect(code).toContain(MCP_URL);
    expect(code).toMatch(/Bearer|bearer_token_env_var/);
  }
  for (const a of AGENTS) for (const s of a.steps) if (s.code?.trim().startsWith('{')) JSON.parse(s.code); // config snippets are valid JSON
});

test('instructions render a tab per agent', () => {
  const html = renderToStaticMarkup(<McpInstructions />);
  for (const name of ['Claude Code', 'Claude Desktop', 'Codex', 'Cursor', 'VS Code', 'Gemini CLI', 'Other']) expect(html).toContain(`>${name}<`);
  expect(html).toContain('claude mcp add -s user --transport http tracklines');
});

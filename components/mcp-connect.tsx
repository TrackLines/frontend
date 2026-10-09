'use client';

import { useState, type ReactNode } from 'react';
import { PlugIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/copy-link';

export const MCP_URL = 'https://api.tracklin.es/mcp';
const KEY = 'tl_your_key'; // placeholder: people paste their own API key

// AGENTS: how to point each client at the MCP server (Streamable HTTP + a Bearer API key).
// Each step is prose, optionally with a snippet to copy.
export const AGENTS: { id: string; name: string; steps: { text: ReactNode; code?: string }[] }[] = [
  {
    id: 'claude-code', name: 'Claude Code', steps: [
      { text: 'Run this once in a terminal. -s user makes it available in every project.', code: `claude mcp add -s user --transport http tracklines ${MCP_URL} \\\n  --header "Authorization: Bearer ${KEY}"` },
      { text: <>Start a new session and check it with <code>/mcp</code>.</> },
    ],
  },
  {
    id: 'claude-desktop', name: 'Claude Desktop', steps: [
      { text: <>Settings → Developer → Edit Config, then add this to <code>claude_desktop_config.json</code> (it bridges to the remote server with <code>mcp-remote</code>, which needs Node.js):</>,
        code: JSON.stringify({ mcpServers: { tracklines: { command: 'npx', args: ['-y', 'mcp-remote', MCP_URL, '--header', `Authorization: Bearer ${KEY}`] } } }, null, 2) },
      { text: 'Restart Claude Desktop; TrackLines appears in the tools menu.' },
    ],
  },
  {
    id: 'codex', name: 'Codex', steps: [
      { text: <>Keep the key in an environment variable (e.g. in your shell profile):</>, code: `export TRACKLINES_TOKEN=${KEY}` },
      { text: <>Add the server to <code>~/.codex/config.toml</code>:</>, code: `[mcp_servers.tracklines]\nurl = "${MCP_URL}"\nbearer_token_env_var = "TRACKLINES_TOKEN"` },
      { text: <>Start a new Codex session; check it with <code>/mcp</code>.</> },
    ],
  },
  {
    id: 'cursor', name: 'Cursor', steps: [
      { text: <>Add to <code>~/.cursor/mcp.json</code> (or <code>.cursor/mcp.json</code> in a project):</>,
        code: JSON.stringify({ mcpServers: { tracklines: { url: MCP_URL, headers: { Authorization: `Bearer ${KEY}` } } } }, null, 2) },
      { text: 'Then enable it under Settings → MCP.' },
    ],
  },
  {
    id: 'vscode', name: 'VS Code', steps: [
      { text: <>For GitHub Copilot agent mode, add to <code>.vscode/mcp.json</code>; VS Code asks for the key once and stores it securely:</>,
        code: JSON.stringify({
          inputs: [{ type: 'promptString', id: 'tracklines-key', description: 'TrackLines API key', password: true }],
          servers: { tracklines: { type: 'http', url: MCP_URL, headers: { Authorization: 'Bearer ${input:tracklines-key}' } } },
        }, null, 2) },
    ],
  },
  {
    id: 'gemini', name: 'Gemini CLI', steps: [
      { text: <>Add to <code>~/.gemini/settings.json</code>:</>,
        code: JSON.stringify({ mcpServers: { tracklines: { httpUrl: MCP_URL, headers: { Authorization: `Bearer ${KEY}` } } } }, null, 2) },
      { text: <>Check it with <code>/mcp</code> in a new session.</> },
    ],
  },
  {
    id: 'other', name: 'Other', steps: [
      { text: 'Any MCP client that supports remote servers over Streamable HTTP:' },
      { text: 'Endpoint', code: MCP_URL },
      { text: 'Header', code: `Authorization: Bearer ${KEY}` },
      { text: 'The server is stateless and answers with JSON, so no session handling is needed. Tools mirror the REST API, with the same permissions.' },
    ],
  },
];

// McpConnect opens the "connect an AI agent" instructions, one tab per client.
// keyHint explains where to get an API key (a link in the app, sign-up on the landing page).
export function McpConnect({ keyHint, trigger }: { keyHint: ReactNode; trigger?: (open: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {trigger ? trigger(() => setOpen(true)) : (
        <Button variant="outline" onClick={() => setOpen(true)}><PlugIcon />Connect an AI agent</Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Connect an AI agent</DialogTitle>
            <DialogDescription>
              TrackLines has a built-in MCP server, so agents can read boards, claim tickets, move them and comment. {keyHint}
            </DialogDescription>
          </DialogHeader>
          <McpInstructions />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function McpInstructions() {
  return (
    <Tabs defaultValue={AGENTS[0].id} className="min-w-0">
      <TabsList className="h-auto flex-wrap">
        {AGENTS.map((a) => <TabsTrigger key={a.id} value={a.id}>{a.name}</TabsTrigger>)}
      </TabsList>
      {AGENTS.map((a) => (
        <TabsContent key={a.id} value={a.id} className="grid gap-3 pt-2 text-sm">
          {a.steps.map((s, i) => (
            <div key={i} className="grid min-w-0 gap-1.5">
              <p className="text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-foreground">{s.text}</p>
              {s.code && (
                <div className="flex min-w-0 items-start gap-2">
                  <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-5">{s.code}</pre>
                  <CopyButton value={s.code} label="Copy" size="sm" className="shrink-0" ariaLabel={`Copy ${a.name} snippet`} />
                </div>
              )}
            </div>
          ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}

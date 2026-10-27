'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type ReactNode } from 'react';
import { PlugIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/common/copy-link';

export const MCP_URL = 'https://api.tracklin.es/mcp';
const KEY = 'tl_ai_your_key'; // placeholder: people paste their own API key

// AGENTS: how to point each client at the MCP server (Streamable HTTP + a Bearer API key).
// Each step is prose (<Trans>, so it's translated where it renders), optionally with a snippet to copy.
export const AGENTS: { id: string; name: string; steps: { text: ReactNode; code?: string }[] }[] = [
  {
    id: 'claude-code', name: 'Claude Code', steps: [
      { text: <Trans>Run this once in a terminal. -s user makes it available in every project.</Trans>, code: `claude mcp add -s user --transport http tracklines ${MCP_URL} \\\n  --header "Authorization: Bearer ${KEY}"` },
      { text: <Trans>Start a new session and check it with <code>/mcp</code>.</Trans> },
    ],
  },
  {
    id: 'claude-desktop', name: 'Claude Desktop', steps: [
      { text: <Trans>Settings → Developer → Edit Config, then add this to <code>claude_desktop_config.json</code> (it bridges to the remote server with <code>mcp-remote</code>, which needs Node.js):</Trans>,
        code: JSON.stringify({ mcpServers: { tracklines: { command: 'npx', args: ['-y', 'mcp-remote', MCP_URL, '--header', `Authorization: Bearer ${KEY}`] } } }, null, 2) },
      { text: <Trans>Restart Claude Desktop; TrackLin.es appears in the tools menu.</Trans> },
    ],
  },
  {
    id: 'codex', name: 'Codex', steps: [
      { text: <Trans>Keep the key in an environment variable (e.g. in your shell profile):</Trans>, code: `export TRACKLINES_TOKEN=${KEY}` },
      { text: <Trans>Add the server to <code>~/.codex/config.toml</code>:</Trans>, code: `[mcp_servers.tracklines]\nurl = "${MCP_URL}"\nbearer_token_env_var = "TRACKLINES_TOKEN"` },
      { text: <Trans>Start a new Codex session; check it with <code>/mcp</code>.</Trans> },
    ],
  },
  {
    id: 'cursor', name: 'Cursor', steps: [
      { text: <Trans>Add to <code>~/.cursor/mcp.json</code> (or <code>.cursor/mcp.json</code> in a project):</Trans>,
        code: JSON.stringify({ mcpServers: { tracklines: { url: MCP_URL, headers: { Authorization: `Bearer ${KEY}` } } } }, null, 2) },
      { text: <Trans>Then enable it under Settings → MCP.</Trans> },
    ],
  },
  {
    id: 'vscode', name: 'VS Code', steps: [
      { text: <Trans>For GitHub Copilot agent mode, add to <code>.vscode/mcp.json</code>; VS Code asks for the key once and stores it securely:</Trans>,
        code: JSON.stringify({
          inputs: [{ type: 'promptString', id: 'tracklines-key', description: 'TrackLin.es API key', password: true }],
          servers: { tracklines: { type: 'http', url: MCP_URL, headers: { Authorization: 'Bearer ${input:tracklines-key}' } } },
        }, null, 2) },
    ],
  },
  {
    id: 'gemini', name: 'Gemini CLI', steps: [
      { text: <Trans>Add to <code>~/.gemini/settings.json</code>:</Trans>,
        code: JSON.stringify({ mcpServers: { tracklines: { httpUrl: MCP_URL, headers: { Authorization: `Bearer ${KEY}` } } } }, null, 2) },
      { text: <Trans>Check it with <code>/mcp</code> in a new session.</Trans> },
    ],
  },
  {
    id: 'other', name: 'Other', steps: [
      { text: <Trans>Any MCP client that supports remote servers over Streamable HTTP:</Trans> },
      { text: <Trans>Endpoint</Trans>, code: MCP_URL },
      { text: <Trans>Header</Trans>, code: `Authorization: Bearer ${KEY}` },
      { text: <Trans>The server is stateless and answers with JSON, so no session handling is needed. Tools mirror the REST API, with the same permissions.</Trans> },
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
        <Button variant="outline" onClick={() => setOpen(true)}><PlugIcon /><Trans>Connect an AI agent</Trans></Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle><Trans>Connect an AI agent</Trans></DialogTitle>
            <DialogDescription>
              <Trans>TrackLin.es has a built-in MCP server, so agents can read boards, claim tickets, move them and comment.</Trans> {keyHint}
            </DialogDescription>
          </DialogHeader>
          <McpInstructions />
        </DialogContent>
      </Dialog>
    </>
  );
}

// McpInstructions: setup steps per client. With apiKey (a key just created, TL-269) the snippets carry
// it in place of tl_ai_your_key, and initial opens that key's client.
export function McpInstructions({ apiKey, initial }: { apiKey?: string; initial?: string } = {}) {
  const { t } = useLingui();
  const fill = (code: string) => (apiKey ? code.replaceAll(KEY, apiKey) : code);
  return (
    <Tabs defaultValue={AGENTS.some((a) => a.id === initial) ? initial : AGENTS[0].id} className="min-w-0">
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
                  <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-5">{fill(s.code)}</pre>
                  <CopyButton value={fill(s.code)} label={t`Copy`} size="sm" className="shrink-0" ariaLabel={t`Copy ${a.name} snippet`} />
                </div>
              )}
            </div>
          ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}

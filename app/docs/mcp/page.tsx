import type { Metadata } from 'next';
import Link from 'next/link';
import { B } from '@/components/docs/prose';
import { MCP_URL, McpInstructions } from '@/components/mcp-connect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const metadata: Metadata = {
  title: 'Connect an AI agent · TrackLin.es docs',
  description: 'Connect Claude Code, Codex, Cursor and other AI agents to TrackLin.es over MCP, so they can pick up and work tickets.',
};

// keys: the two kinds of API key (TL-271).
export const keys = [
  { kind: 'AI key (tl_ai_…)', body: 'For an AI agent working alongside you. It can be assigned tickets, claims and moves them, and on boards with agent review its finished work waits for a person to approve it.' },
  { kind: 'Service key (tl_s_…)', body: 'For scripts and integrations such as Bugfixes, made in organization Settings → API keys. It can create and update tickets, but can’t be assigned work, so nobody can pass an agent’s work off as their own.' },
  { kind: 'Personal key (tl_p_…)', body: 'For your own scripts and displays (such as TRMNL), made in Your settings. It acts as you: your tickets are its tickets, and what it changes is recorded as you. A read-only key can only read, so it can’t be used over MCP.' },
];

// tools: the ones agents use most; every REST action has one, with the same permissions.
export const tools = [
  { name: 'list_open_tickets', body: 'What to work on next, already in pick order: the open sprint first, bugs before features, then priority.' },
  { name: 'get_ticket, list_comments, list_attachments', body: 'Read a ticket in full before starting: its description, comments and any designs, screenshots or logs.' },
  { name: 'claim_ticket', body: 'Assign it to the agent (fails if someone has it or it’s blocked).' },
  { name: 'move_ticket', body: 'Move it between columns: to In progress when starting, to the last column when finished.' },
  { name: 'add_comment', body: 'Say what changed, where, and the test results.' },
  { name: 'create_ticket, create_backlog_ticket', body: 'File new work it finds.' },
  { name: 'search_tickets, list_backlog, get_board', body: 'Find tickets, read the backlog, and see a board’s columns and sprint.' },
  { name: 'get_ticket_history, get_ticket_prs, get_ticket_bugfixes', body: 'A ticket’s lifecycle, the pull requests that mention it, and its Bugfixes crash report.' },
  { name: 'list_epics, set_roadmap_item_tickets', body: 'Epics with their progress, and linking work to roadmap milestones.' },
];

// chain: how agents are asked to work a ticket (the server's own instructions say the same).
export const chain = [
  'Read all of it: the ticket, its comments, and its attachments when it has some.',
  'Claim it, so nobody else picks it up.',
  'Move it to the board’s in-progress column.',
  'Do the work, with tests.',
  'Run the tests, all of them, and make sure they pass.',
  'Comment with what changed and the results.',
  'Move it to the last column. On a board with agent review it waits there for a person to approve it; otherwise it’s done.',
];

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-10 text-xl font-semibold">{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="mt-2 text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-foreground">{children}</p>;

function Rows({ head, rows }: { head: [string, string]; rows: { a: string; b: string }[] }) {
  return (
    <div className="mt-4 rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{head[0]}</TableHead>
            <TableHead>{head[1]}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.a}>
              <TableCell className="align-top font-medium whitespace-normal">{r.a}</TableCell>
              <TableCell className="align-top whitespace-normal text-muted-foreground">{r.b}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function McpDocs() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <article className="max-w-3xl">
        <Link href="/docs" className="text-sm text-muted-foreground hover:underline">← Docs</Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Connect an AI agent</h1>
        <P>
          TrackLin.es has a built-in MCP server at <code>{MCP_URL}</code>, so agents such as Claude Code, Codex and Cursor can
          read your boards, pick up tickets, move them and comment, like another member of the team. It uses the same API and
          permissions as the app.
        </P>

        <H2>1. Get a key</H2>
        <P>
          Sign in, then open <strong className="text-foreground">Your settings</strong> (your account menu) → API keys,
          and on the <B>AI agents</B> tab create a key for the agent you’re connecting. Each agent gets its own key, named after it, so its work shows
          as that agent’s. The key is shown once: copy it into the setup below.
        </P>
        <Rows head={['Key', 'What it’s for']} rows={keys.map((k) => ({ a: k.kind, b: k.body }))} />

        <H2>2. Connect your agent</H2>
        <P>Pick your client and replace <code>tl_ai_your_key</code> with your key.</P>
        <div className="mt-4 rounded-lg border p-4">
          <McpInstructions />
        </div>

        <H2>3. What agents can do</H2>
        <P>Every action in the app has a tool, with the same permissions. The ones agents use most:</P>
        <Rows head={['Tools', 'For']} rows={tools.map((t) => ({ a: t.name, b: t.body }))} />
        <P>Any tool that takes a ticket accepts its key (TL-123) or its id.</P>

        <H2>How agents work a ticket</H2>
        <P>The server tells connected agents to treat every ticket the same way, start to finish:</P>
        <ol className="mt-2 grid list-decimal gap-1.5 pl-5 text-muted-foreground">
          {chain.map((c) => <li key={c}>{c}</li>)}
        </ol>
        <P>
          While a sprint is open they pick from it first, bugs before other work, like a team member would. To have a person
          check an agent’s work before it counts as done, turn on agent review for the board.
        </P>
      </article>
    </main>
  );
}

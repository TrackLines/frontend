import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Docs · TrackLin.es',
  description: 'Guides to working in TrackLin.es.',
};

// guides: one card each on /docs. Add a guide by adding its page under app/docs and a line here.
export const guides = [
  { slug: 'mcp', name: 'Connect an AI agent', body: 'Connect Claude Code, Codex, Cursor and other agents over MCP, so they can pick up and work tickets.' },
  { slug: 'standup', name: 'Standup', body: 'Run the daily catch-up on the board: a turn each with your tickets, then a review of the whole board.' },
  { slug: 'refinement', name: 'Refinement', body: 'Plan the next sprints from the backlog, size the work, and keep each sprint to what the team can do.' },
  { slug: 'google-chat', name: 'Google Chat for you', body: 'Get your own notifications as direct messages from the TrackLin.es app in Google Chat.' },
  { slug: 'google-chat-org', name: 'Google Chat for your organization', body: 'Post your team’s activity into Google Chat spaces, and let people use the TrackLin.es Chat app.' },
  { slug: 'google-calendar', name: 'Google Calendar', body: 'Connect your Google Workspace so TrackLin.es knows who’s on holiday, in assigning and in standup.' },
  { slug: 'sprint-reports', name: 'Sprint reports', body: 'How a board, project or your organization delivered, with charts, to share as a PDF or Markdown.' },
  { slug: 'epics', name: 'Epics', body: 'Large pieces of work across boards: how they differ from tickets, and using them on roadmaps.' },
];

// Docs: the guides, public (no sign-in), like the Bugfixes docs.
export default function DocsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Docs</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Guides to working in TrackLin.es.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link href={`/docs/${g.slug}`} className="block h-full">
              <Card className="h-full transition-colors hover:bg-muted">
                <CardHeader>
                  <CardTitle>{g.name}</CardTitle>
                  <CardDescription>{g.body}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

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

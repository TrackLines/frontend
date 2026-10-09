import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { BotIcon, GitBranchIcon, LayersIcon, LockIcon, MapIcon, TagIcon, UsersIcon, type LucideIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PriorityBadge } from '@/components/board/priority-badge';
import { BlockedBadge } from '@/components/ticket/blocked-badge';
import { TicketLabels } from '@/components/ticket/labels';
import { TypeBadge } from '@/components/ticket-type';
import type { TicketType } from '@/lib/api';

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <main>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 md:pt-20">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[.14em] text-primary">Boards, backlog and roadmaps</p>
        <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Work moves forward. Everyone can see where.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Plan on simple boards with your team, hand tickets to your AI agents, and share a roadmap with anyone, no account needed to read it.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/sign-up" className={buttonVariants({ size: 'lg' })}>Start free</Link>
          <Link href="/sign-in" className={buttonVariants({ size: 'lg', variant: 'outline' })}>Sign in</Link>
        </div>
        <BoardPreview />
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-bold tracking-tight">Everything a small team needs, nothing it doesn&apos;t</h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => <Feature key={f.title} {...f} />)}
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[.14em] text-primary">Built for AI agents</p>
          <h2 className="text-3xl font-bold tracking-tight">Your agents pick up tickets like teammates</h2>
          <p className="mt-4 text-muted-foreground">
            Give an agent its own API key and it can read the board, claim the highest-priority ticket, move it along and leave a comment when it&apos;s done. Every change shows who made it, person or agent.
          </p>
          <p className="mt-3 text-muted-foreground">Use the documented HTTP API, or the MCP server for coding agents.</p>
        </div>
        <pre className="overflow-x-auto rounded-xl border bg-card p-5 font-mono text-xs leading-6 text-muted-foreground">
{`# claim the next ticket
POST /api/tickets/{id}/claim

# move it to In progress
POST /api/tickets/{id}/move
{ "column_id": "…", "position": 0 }

# report back
POST /api/tickets/{id}/comments
{ "body": "Fixed in #42, tests pass" }`}
        </pre>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-bold tracking-tight">Simple pricing</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Plan name="Free" blurb="One project with unlimited boards, tickets and roadmaps." cta="Start free" href="/sign-up" />
            <Plan name="Pro" blurb="Unlimited projects, for teams running more than one thing at once." cta="Start free, upgrade any time" href="/sign-up" />
          </div>
        </div>
      </section>
    </main>
  );
}

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: LayersIcon, title: 'Boards per team', body: 'Drag tickets between columns. Each team gets its own board inside a shared project.' },
  { icon: GitBranchIcon, title: 'A real backlog', body: 'Park work until it’s ready, filter by type and label, then send it to a board.' },
  { icon: TagIcon, title: 'Priorities and labels', body: 'Bugs, features and tasks, from low to urgent, with labels you can filter by.' },
  { icon: LockIcon, title: 'Dependencies', body: 'Sub-tickets and blockers, so nobody starts work that’s still waiting on something.' },
  { icon: UsersIcon, title: 'Shared with your org', body: 'Projects belong to your organization, so everyone on the team sees the same boards.' },
  { icon: MapIcon, title: 'Shareable roadmaps', body: 'Group milestones into a roadmap and send a public link; dates stay optional.' },
];

function Feature({ icon: Icon, title, body }: (typeof FEATURES)[number]) {
  return (
    <li className="flex gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" aria-hidden /></span>
      <span>
        <strong className="font-semibold">{title}</strong>
        <span className="mt-1 block text-sm text-muted-foreground">{body}</span>
      </span>
    </li>
  );
}

function Plan({ name, blurb, cta, href }: { name: string; blurb: string; cta: string; href: string }) {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold">{name}</h3>
      <p className="text-muted-foreground">{blurb}</p>
      <Link href={href} className={buttonVariants({ variant: name === 'Pro' ? 'default' : 'outline', className: 'w-fit' })}>{cta}</Link>
    </Card>
  );
}

// BoardPreview is a static picture of a board, built from the real ticket badges.
type PreviewTicket = { title: string; type: TicketType; priority?: string; labels?: string[]; blocked?: boolean; who?: string };
const COLUMNS: { name: string; tickets: PreviewTicket[] }[] = [
  { name: 'To do', tickets: [
    { title: 'Checkout fails on expired cards', type: 'bug', priority: 'urgent', labels: ['payments'] },
    { title: 'Export roadmap as PDF', type: 'feature', blocked: true },
  ] },
  { name: 'In progress', tickets: [
    { title: 'Paginate the backlog', type: 'task', priority: 'high', labels: ['perf'], who: 'claude' },
    { title: 'Label filter on boards', type: 'feature', labels: ['ui'], who: 'Sam' },
  ] },
  { name: 'Done', tickets: [
    { title: 'Org-owned projects', type: 'feature', who: 'Alex' },
  ] },
];

function BoardPreview() {
  return (
    <div aria-hidden className="mt-14 grid gap-4 rounded-2xl border bg-muted/40 p-4 sm:grid-cols-3">
      {COLUMNS.map((c) => (
        <div key={c.name} className="grid content-start gap-3">
          <p className="px-1 text-sm font-semibold">{c.name} <span className="font-normal text-muted-foreground">{c.tickets.length}</span></p>
          {c.tickets.map((t) => (
            <Card key={t.title} className="gap-2 px-3 py-3 shadow-xs">
              <p className="text-sm font-medium">{t.title}</p>
              <div className="flex flex-wrap items-center gap-1">
                <TypeBadge type={t.type} />
                <PriorityBadge priority={t.priority} hideDefault />
                {t.blocked && <BlockedBadge />}
                <TicketLabels labels={t.labels} />
                {t.who && <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">{t.who === 'claude' && <BotIcon className="size-3" />}{t.who}</span>}
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}

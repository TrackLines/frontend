import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { BotIcon, BugIcon, LockIcon, MapIcon, type LucideIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { McpConnect } from '@/components/mcp-connect';
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
          <h2 className="text-3xl font-bold tracking-tight">What makes it different</h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2">
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
          <p className="mt-3 text-muted-foreground">
            Connect Claude, Codex or any MCP client to the built-in MCP server and just ask it to pick up work. Prefer to script it? The same actions are a documented HTTP API, with the same permissions.
          </p>
          <div className="mt-6">
            <McpConnect keyHint="Sign up, then create an API key for each agent in Settings → API keys; every change it makes shows its name." />
          </div>
        </div>
        <pre className="overflow-x-auto rounded-xl border bg-card p-5 font-mono text-xs leading-6 text-muted-foreground">
{`# connect Claude Code (or any MCP client)
claude mcp add -s user --transport http tracklines \\
  https://api.tracklin.es/mcp \\
  --header "Authorization: Bearer tl_…"

# then just ask
> pick up the most urgent ticket on Backend

  list_backlog → claim_ticket → move_ticket
  … does the work …
  add_comment "Fixed in #42, tests pass"`}
        </pre>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-bold tracking-tight">Simple pricing</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Plan name="Free" price="$0" blurb="One project with unlimited boards, tickets and roadmaps." cta="Start free" href="/sign-up" />
            <Plan name="Pro" price="$10 / month" blurb="Unlimited projects, for teams running more than one thing at once." cta="Start free, upgrade any time" href="/sign-up" />
          </div>
        </div>
      </section>
    </main>
  );
}

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: BotIcon, title: 'Agents as teammates', body: 'Connect agents over MCP with their own keys; they claim tickets and show up on the board next to everyone else.' },
  { icon: LockIcon, title: 'Blockers that hold', body: 'A ticket waiting on unfinished work can’t be claimed, by a person or an agent.' },
  { icon: BugIcon, title: 'Errors become tickets', body: 'Connect Bugfixes and the errors it catches land on your board as bug tickets.' },
  { icon: MapIcon, title: 'Roadmaps anyone can read', body: 'Send a public link to customers; they don’t need an account to see what’s coming.' },
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

function Plan({ name, price, blurb, cta, href }: { name: string; price: string; blurb: string; cta: string; href: string }) {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold">{name}</h3>
      <p className="text-3xl font-bold tracking-tight">{price}</p>
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

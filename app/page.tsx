import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { BotIcon, BugIcon, LockIcon, MapIcon, ShieldCheckIcon, UsersIcon, type LucideIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { McpConnect } from '@/components/mcp-connect';
import { BoardPreview } from '@/components/landing/board-preview';
import { Card } from '@/components/ui/card';

import { OUR_REQUEST_FORM, OUR_ROADMAP } from '@/lib/our-links';

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
          <p className="mt-3 text-muted-foreground">
            You stay in charge: on boards with review turned on, an agent&apos;s finished work waits for a person to approve it before it counts as done.
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
  add_comment "Fixed in #42, tests pass"
  → needs review: you approve, it's Done`}
        </pre>
      </section>

      <section className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-12">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight">Got an idea or found a bug?</h2>
            <p className="mt-2 text-muted-foreground">
              Tell us on our own request form, no account needed, and see what&apos;s coming on our public roadmap. They&apos;re the same form and roadmap you can share with your customers, so you&apos;ll see exactly what they see.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={OUR_REQUEST_FORM} className={buttonVariants({ size: 'lg', variant: 'outline' })}>Send us a suggestion</Link>
            <Link href={OUR_ROADMAP} className={buttonVariants({ size: 'lg', variant: 'ghost' })}>See our roadmap</Link>
          </div>
        </div>
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

const FEATURES: { icon: LucideIcon; title: string; body: string; links?: { href: string; label: string }[] }[] = [
  { icon: BotIcon, title: 'Agents as teammates', body: 'Connect agents over MCP with their own keys; they claim tickets and show up on the board next to everyone else.' },
  { icon: ShieldCheckIcon, title: 'Agent work gets reviewed', body: 'Turn on review for a board and an agent’s finished ticket waits for a person to approve it or send it back with a note.' },
  { icon: LockIcon, title: 'Blockers that hold', body: 'A ticket waiting on unfinished work can’t be claimed, by a person or an agent.' },
  { icon: UsersIcon, title: 'Standup and refinement built in', body: 'Run standup with a shared timer everyone sees, and plan the next sprints against your team’s real pace, with sign-off before taking on more.' },
  { icon: BugIcon, title: 'Errors become tickets', body: 'Bugfixes files the errors it catches as bug tickets, with live details: how often, when it was last seen, and a warning if it comes back after it’s fixed.' },
  { icon: MapIcon, title: 'Customers stay in the loop', body: 'Share a request form and a public roadmap; no account needed. They send bugs and ideas, see what’s coming, and hear back when something won’t be done.', links: [{ href: OUR_REQUEST_FORM, label: 'Try our request form →' }, { href: OUR_ROADMAP, label: 'See our roadmap →' }] },
];

function Feature({ icon: Icon, title, body, links }: (typeof FEATURES)[number]) {
  return (
    <li className="flex gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" aria-hidden /></span>
      <span>
        <strong className="font-semibold">{title}</strong>
        <span className="mt-1 block text-sm text-muted-foreground">{body}</span>
        {links && <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{links.map((l) => <Link key={l.href} href={l.href} className="text-sm font-medium text-primary hover:underline">{l.label}</Link>)}</span>}
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

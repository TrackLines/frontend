'use client';

import { useState } from 'react';
import { BotIcon, PaperclipIcon, PencilIcon } from 'lucide-react';
import { PriorityBadge } from '@/components/board/priority-badge';
import { TicketView } from '@/components/board/ticket-view';
import { formatSize } from '@/components/ticket/attachments';
import { BlockedBadge } from '@/components/ticket/blocked-badge';
import { BugfixesPanelView } from '@/components/ticket/bugfixes-panel';
import { PullRequestsPanelView } from '@/components/ticket/pull-requests-panel';
import { CommentList } from '@/components/ticket/comments';
import { TicketLabels } from '@/components/ticket/labels';
import { TicketKey } from '@/components/ticket/ticket-key';
import { TypeBadge } from '@/components/ticket-type';
import { When } from '@/components/when';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Ticket, TicketBugfixes, TicketComment, TicketPR } from '@/lib/api';

// BoardPreview: the landing page's sample board. Cards are laid out like the real TicketCard and open
// the real TicketView with sample content: read-only, no edit, comment box or attaching.
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

export type Sample = {
  ticket: Ticket;
  bugfixes?: TicketBugfixes;
  files?: { name: string; size: number; by: string }[];
  prs?: TicketPR[]; // no url: a sample links nowhere
  comments?: { author: string; hours: number; body: string; reply?: boolean }[];
};

const sample = (key: string, t: Omit<Ticket, 'id' | 'key' | 'column_id' | 'position' | 'created_at'> & { hours: number }, extra: Omit<Sample, 'ticket'> = {}): Sample => {
  const { hours, ...rest } = t;
  return { ticket: { id: key, key, column_id: '', position: 0, created_at: hoursAgo(hours), ...rest }, ...extra };
};

const COLUMNS: { name: string; tickets: Sample[] }[] = [
  { name: 'To do', tickets: [
    sample('SHOP-42', {
      title: 'Checkout fails on expired cards', type: 'bug', priority: 'urgent', labels: ['payments'], estimate: '3', created_by: 'Bugfixes', hours: 2,
      external_source: 'bugfixes',
      description: 'Paying with an expired card shows a blank page instead of “Your card has expired”.\n\n**Steps**\n1. Add an item to the basket\n2. Pay with a card that expired last month\n3. The page goes blank\n\n**Expected:** the card error, with the form still filled in.',
    }, {
      bugfixes: { source: 'bugfixes', project: 'shop', report_id: '1', url: '', available: true, regressed: false,
        report: { title: 'TypeError: cannot read properties of undefined (reading "code")', occurrences: 37, status: 'open', last_seen: hoursAgo(0.3), levels: ['error'], file: 'src/checkout/pay.ts', line: 88 } },
      files: [{ name: 'blank-checkout.png', size: 248_000, by: 'Sam' }],
      comments: [
        { author: 'Bugfixes', hours: 2, body: '**AI analysis:** the card error has no `code` when the card is expired, so `pay.ts:88` throws before the message renders.' },
        { author: 'Sam', hours: 1, body: 'Seeing this on mobile too. Bumped it to urgent.', reply: true },
      ],
    }),
    sample('SHOP-39', {
      title: 'Export roadmap as PDF', type: 'feature', blocked: true, estimate: '5', created_by: 'Sam', hours: 72,
      description: 'Customers want to share the roadmap in decks.\n\n- One page per quarter\n- Keep the status colours\n- Our logo in the header\n\nWaits on **SHOP-38** (the PDF rendering service).',
    }, {
      files: [{ name: 'roadmap-export-mockup.pdf', size: 1_400_000, by: 'Sam' }],
      comments: [{ author: 'Alex', hours: 50, body: 'Marked as blocked by SHOP-38: nothing to render with until that lands.' }],
    }),
  ] },
  { name: 'In progress', tickets: [
    sample('SHOP-37', {
      title: 'Paginate the backlog', type: 'task', priority: 'high', labels: ['perf'], estimate: '2', assigned_to: 'claude', created_by: 'Alex', hours: 26,
      description: 'The backlog loads every ticket at once; big projects take seconds.\n\n- 50 per page\n- Filters and sort still apply across pages',
    }, {
      prs: [{ provider: 'github', repo: 'acme/shop', number: 214, url: '', title: 'SHOP-37: paginate the backlog', state: 'open', author: 'claude', branch: 'shop-37-paginate-backlog', updated_at: hoursAgo(1) }],
      comments: [
        { author: 'claude', hours: 3, body: 'Claimed it. Plan: `LIMIT/OFFSET` with a stable sort, counts in the same query, pager under the list.' },
        { author: 'claude', hours: 1, body: 'Pagination works and the tests pass. PR #214 is open for review.' },
        { author: 'Alex', hours: 0.5, body: 'Looks good, checking it on the big project now.', reply: true },
      ],
    }),
    sample('SHOP-35', {
      title: 'Label filter on boards', type: 'feature', labels: ['ui'], estimate: '3', assigned_to: 'Sam', created_by: 'Sam', hours: 48,
      description: 'Filter the board by one or more labels; the filter stays while you move between boards.',
    }, {
      comments: [{ author: 'Sam', hours: 20, body: 'Dropdown is in; working on remembering it per board.' }],
    }),
  ] },
  { name: 'Done', tickets: [
    sample('SHOP-31', {
      title: 'Org-owned projects', type: 'feature', estimate: '8', assigned_to: 'Alex', created_by: 'Alex', hours: 170, done_at: hoursAgo(30),
      description: 'Projects belong to the organization, not the person who made them, so they stay when someone leaves.',
    }, {
      comments: [{ author: 'Alex', hours: 30, body: 'Shipped. Existing projects moved over on deploy.' }],
    }),
  ] },
];

export function BoardPreview() {
  const [open, setOpen] = useState<{ s: Sample; column: string } | null>(null);
  return (
    <>
      <div className="mt-14 grid gap-4 rounded-2xl border bg-muted/40 p-4 sm:grid-cols-3">
        {COLUMNS.map((c) => (
          <div key={c.name} className="grid content-start gap-3">
            <p className="px-1 text-sm font-semibold">{c.name} <span className="font-normal text-muted-foreground">{c.tickets.length}</span></p>
            {c.tickets.map((s) => <PreviewCard key={s.ticket.id} s={s} onOpen={() => setOpen({ s, column: c.name })} />)}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">A sample board: click a ticket to see its details.</p>
      {open && (
        <TicketView open onOpenChange={(o) => { if (!o) setOpen(null); }} ticket={open.s.ticket} columnName={open.column} sample={<SampleSections s={open.s} />} />
      )}
    </>
  );
}

// PreviewCard mirrors TicketCard (keep them in step); the whole card opens it, the title for keyboards.
function PreviewCard({ s, onOpen }: { s: Sample; onOpen: () => void }) {
  const t = s.ticket;
  return (
    <Card className="w-full min-w-0 cursor-pointer gap-2 py-3 shadow-xs transition-shadow hover:shadow-md" onClick={onOpen}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3">
        <TicketKey value={t.key} />
        {t.type && t.type !== 'task' && <TypeBadge type={t.type} />}
        <PriorityBadge priority={t.priority} hideDefault />
        {t.blocked && <BlockedBadge />}
        {t.external_source === 'bugfixes' && <Badge variant="outline">Bugfixes</Badge>}
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {t.estimate && <Badge variant="outline" className="size-6 justify-center rounded-full p-0" aria-label={`Estimate ${t.estimate}`}>{t.estimate}</Badge>}
          <span aria-hidden className="grid size-7 place-items-center text-muted-foreground"><PencilIcon className="size-3.5" /></span>
        </span>
      </div>
      <Button type="button" variant="link" onClick={(e) => { e.stopPropagation(); onOpen(); }}
        className="mx-3 h-auto min-w-0 justify-start p-0 text-left text-base leading-5 font-medium whitespace-normal text-foreground">
        {t.title}
      </Button>
      <TicketLabels labels={t.labels} className="px-3" max={2} />
      <div className="mt-auto flex items-center justify-between gap-2 px-3 pt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 truncate">
          {t.assigned_to ? <>{t.assigned_to === 'claude' && <BotIcon className="size-3" aria-hidden />}{t.assigned_to}</> : <span className="italic">Unassigned</span>}
        </span>
        <span className="truncate">by {t.created_by}, <When iso={t.created_at!} /></span>
      </div>
    </Card>
  );
}

// SampleSections stand in for the modal's live sections (Bugfixes, attachments, conversation),
// with their real look but nothing to change.
export function SampleSections({ s }: { s: Sample }) {
  const comments: TicketComment[] = [];
  for (const [i, c] of (s.comments ?? []).entries()) {
    comments.push({ id: `${s.ticket.id}-${i}`, ticket_id: s.ticket.id, parent_comment_id: c.reply && i > 0 ? `${s.ticket.id}-${i - 1}` : null, body: c.body, author: c.author, created_at: hoursAgo(c.hours) });
  }
  return (
    <>
      {s.bugfixes && <BugfixesPanelView data={s.bugfixes} />}
      <section aria-label="Attachments" className="grid gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><PaperclipIcon className="size-4" aria-hidden /> Attachments ({s.files?.length ?? 0})</h2>
        {s.files?.length ? (
          <ul className="divide-y rounded-lg border">
            {s.files.map((f) => (
              <li key={f.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
                <span className="text-muted-foreground">{formatSize(f.size)} · {f.by}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No files attached.</p>}
      </section>
      {s.prs && <PullRequestsPanelView prs={s.prs} />}
      <section aria-label="Ticket conversation" className="grid min-w-0 gap-4 border-t pt-4">
        <h2 className="font-semibold">Conversation</h2>
        {comments.length ? <CommentList comments={comments} /> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No comments yet.</p>}
      </section>
    </>
  );
}

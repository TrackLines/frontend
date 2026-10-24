import type { I18n, MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

// HelpEntry: one answer in the help panel (TL-569), earlier ones suggested first. href ('' for none) can hold [project] or [board], filled in
// from the page you're on (else `fallback`); pages are the paths it's suggested on before you type;
// words are extra English search terms (the question and answer are searched in your language).
export type HelpEntry = { id: string; q: MessageDescriptor; a: MessageDescriptor; href: string; fallback?: string; pages: RegExp[]; words?: string };

const PROJECT = /^\/projects\/[^/]+/;
const BOARD = /^\/boards\/[^/]+/;
const DASHBOARD = /^\/dashboard/;
const SETTINGS = /^\/settings/;
const ACCOUNT = /^\/account/;

export const HELP: HelpEntry[] = [
  { id: 'add-board', q: msg`How do I add another board?`, a: msg`Boards are added by organization admins. While a project has one board, use New board on the project page; after that, it’s in Edit project → Boards.`, href: '/projects/[project]/edit', pages: [PROJECT], words: 'new board create second third team' },
  { id: 'new-ticket', q: msg`How do I create a ticket?`, a: msg`On a board, use + Add ticket under a column. New ticket in the header (on the dashboard, project and board pages) adds one to the project’s backlog.`, href: '/dashboard', pages: [BOARD, PROJECT, DASHBOARD], words: 'new ticket create add issue' },
  { id: 'backlog', q: msg`Where’s the backlog?`, a: msg`On the project page, in the Backlog tab.`, href: '/projects/[project]', pages: [PROJECT], words: 'backlog' },
  { id: 'sprint', q: msg`How do I start or close a sprint?`, a: msg`On the board’s sprint bar: Start sprint, and Close sprint once it’s running. Admins and the board’s team leads can.`, href: '/boards/[board]', pages: [BOARD], words: 'sprint start close end' },
  { id: 'standup', q: msg`How do I run a standup?`, a: msg`On the board, click Standup, then Start once everyone has joined.`, href: '/docs/standup', pages: [BOARD], words: 'standup daily meeting' },
  { id: 'edit-board', q: msg`How do I change a board’s columns or WIP limits?`, a: msg`Open the board → Edit board. Drag columns to reorder them, set WIP limits, and change the estimate scale. Admins and the board’s team leads can edit it.`, href: '/boards/[board]/edit', pages: [BOARD], words: 'columns wip limit estimates scale settings rename' },
  { id: 'refine', q: msg`How do I plan the next sprints?`, a: msg`On the project page’s Backlog tab, use Refine. Each sprint holds the team’s velocity plus 10%; more needs approval from an admin or the team lead.`, href: '/docs/refinement', pages: [PROJECT], words: 'plan refine refinement capacity approve' },
  { id: 'backlog-to-board', q: msg`How do I move a backlog ticket onto a board?`, a: msg`Open the ticket → Edit → Move to board…, or use Move to board… in Refine. Boards with estimates ask for one first.`, href: '/projects/[project]', pages: [PROJECT], words: 'move board backlog plan' },
  { id: 'other-board', q: msg`How do I move a ticket to another board?`, a: msg`Send it to the backlog from the ticket, then move it onto the other board with Move to board….`, href: '/projects/[project]', pages: [BOARD], words: 'move transfer another board' },
  { id: 'archived-boards', q: msg`Where are archived boards?`, a: msg`In Edit project → Archived boards. Restore one from its banner.`, href: '/projects/[project]/archived', pages: [PROJECT], words: 'archived restore board' },
  { id: 'key-prefix', q: msg`How do I change the ticket key (like TL-)?`, a: msg`In Edit project → Ticket keys. Organization admins only.`, href: '/projects/[project]/edit', pages: [PROJECT], words: 'prefix key ticket number' },
  { id: 'archive-board', q: msg`How do I archive or delete a board?`, a: msg`Open the board → Edit board → More. A board that’s been used can be archived (admins and its team leads); one that never was can be deleted (admins).`, href: '/boards/[board]/edit', pages: [BOARD], words: 'remove archive delete board' },
  { id: 'templates', q: msg`Can I reuse a board’s setup?`, a: msg`Yes: Edit board → More → Save as template (columns, WIP limits, style and estimates, not tickets). Pick it in the Template list when making a new board. Admins only.`, href: '/boards/[board]/edit', pages: [BOARD], words: 'template copy setup' },
  { id: 'new-project', q: msg`How do I create a project?`, a: msg`Use New project on the dashboard. Your plan sets how many projects you can have (Free 1, Pro 5).`, href: '/dashboard', pages: [DASHBOARD], words: 'new project create' },
  { id: 'my-work', q: msg`Where can I see all my tickets?`, a: msg`My work lists what’s assigned to you and what you raised, across every board.`, href: '/my-work', pages: [DASHBOARD], words: 'my tickets assigned mine' },
  { id: 'sub-tickets', q: msg`How do I add sub-tickets?`, a: msg`Open the ticket’s own page; under Sub-tickets use Add a sub-ticket… or New sub-ticket….`, href: '/docs/epics', pages: [], words: 'sub task subtask child parent' },
  { id: 'epics', q: msg`What’s an epic?`, a: msg`A large piece of work across boards. Set a ticket’s type to Epic; epics live in the backlog and have their own tab on the project page.`, href: '/docs/epics', pages: [PROJECT], words: 'epic' },
  { id: 'blocked', q: msg`How do I mark a ticket as blocked?`, a: msg`On the ticket’s page, under Dependencies → Blocked by, use Add a blocker…. A blocked ticket can’t be claimed.`, href: '', pages: [], words: 'blocked blocker dependency depends' },
  { id: 'duplicate', q: msg`How do I mark a duplicate?`, a: msg`On the ticket’s page, use Mark as duplicate… and pick the original. You can copy its labels and comments across.`, href: '', pages: [], words: 'duplicate same copy' },
  { id: 'mention', q: msg`How do I mention someone?`, a: msg`Type @ in a comment and pick them. They’re notified, and it shows on their Mentions page.`, href: '/mentions', pages: [], words: 'mention tag @' },
  { id: 'attach', q: msg`How do I attach files?`, a: msg`Use Attach files on a ticket. Up to 10 files of 10 MB each, and not while it’s in Done.`, href: '', pages: [], words: 'attach file upload image screenshot' },
  { id: 'search', q: msg`How do I find a ticket?`, a: msg`Use the search in the header (Ctrl+K or Cmd+K). It searches titles, details and comments; type a key like TL-123 to jump to it.`, href: '', pages: [], words: 'search find' },
  { id: 'reports', q: msg`Where are sprint reports?`, a: msg`A board’s are under Past sprints → Sprint report; a project’s are in its header; the organization’s are in Settings (admins).`, href: '/docs/sprint-reports', pages: [BOARD, PROJECT], words: 'report velocity burndown chart pdf' },
  { id: 'invite', q: msg`How do I invite people?`, a: msg`Organization admins invite from Settings → Manage organization → Invite people. Free and Pro have up to 20 members; AI agents don’t count.`, href: '/settings/organization', pages: [SETTINGS], words: 'invite member people add user' },
  { id: 'teams', q: msg`How do I set up teams and team leads?`, a: msg`In Settings → Manage organization → Teams: create a team, add members, Make leader, and link its boards. Organization admins only.`, href: '/settings/organization', pages: [SETTINGS], words: 'team lead leader' },
  { id: 'holiday', q: msg`How does it know who’s on holiday?`, a: msg`An organization admin connects Google Calendar in Settings → Integrations → Calendars; people away are marked in assigning and standup.`, href: '/docs/google-calendar', pages: [SETTINGS], words: 'holiday away leave vacation calendar' },
  { id: 'repos', q: msg`How do I link a GitHub repository?`, a: msg`An admin connects GitHub or Bitbucket in Settings → Integrations, then links repos in Edit project → Repositories. Pull requests that mention a ticket’s key show on it, and merging finishes it.`, href: '/projects/[project]/edit', fallback: '/settings/integrations', pages: [PROJECT, SETTINGS], words: 'github bitbucket repo repository pull request pr git' },
  { id: 'api-keys', q: msg`Where do I get an API key?`, a: msg`Your own and AI agent keys are in Your settings → API keys. Service keys for integrations are in Settings → API keys, made by admins.`, href: '/account/api-keys', pages: [ACCOUNT, SETTINGS], words: 'api key token' },
  { id: 'ai-agent', q: msg`How do I connect an AI agent?`, a: msg`Make an AI key in Your settings → API keys, then use Connect AI to set up Claude Code, Codex, Cursor or others over MCP.`, href: '/docs/mcp', pages: [ACCOUNT], words: 'ai agent claude codex cursor mcp' },
  { id: 'roadmap', q: msg`How do I make a roadmap?`, a: msg`On the project page, open the Roadmaps tab → New roadmap. Admins publish it.`, href: '/projects/[project]', fallback: '/roadmaps', pages: [PROJECT], words: 'roadmap publish public' },
  { id: 'requests', q: msg`Can customers send us requests?`, a: msg`Yes: an admin turns on the Request form in Edit project. Requests arrive behind the Requests button on the project page.`, href: '/projects/[project]/edit', pages: [PROJECT], words: 'request form customer feedback feature bug' },
  { id: 'plan', q: msg`How do I upgrade or change plan?`, a: msg`Organization admins use the Plan card in Settings.`, href: '/settings', pages: [SETTINGS], words: 'upgrade plan billing pro enterprise pay subscription' },
  { id: 'theme', q: msg`How do I switch to dark mode?`, a: msg`Use the appearance button in the header: Light, Dark or System.`, href: '', pages: [], words: 'dark light theme appearance' },
  { id: 'language', q: msg`Can I change the language?`, a: msg`When it’s available for you, choose it in Your settings → Language.`, href: '/account', pages: [ACCOUNT], words: 'language dutch nederlands english' },
  { id: 'notifications', q: msg`How do I change my notifications?`, a: msg`Open the bell in the header → Notification settings.`, href: '/account', pages: [ACCOUNT], words: 'notification email bell' },
];

// normalise: lower case, no accents, so "Overzicht" finds "overzicht" and "café" finds "cafe".
const normalise = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

// search: the answers with the most of the query's words, the question's words counting double.
// ponytail: word overlap, no stemming or typos; a fuzzy matcher if people miss answers that exist.
export function search(i18n: I18n, entries: HelpEntry[], query: string, limit = 5): HelpEntry[] {
  const words = normalise(query).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);
  if (words.length === 0) return [];
  return entries
    .map((e) => {
      const q = normalise(i18n._(e.q));
      const rest = normalise(`${i18n._(e.a)} ${e.words ?? ''}`);
      const score = words.reduce((s, w) => s + (q.includes(w) ? 2 : rest.includes(w) ? 1 : 0), 0);
      return { e, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.e);
}

// suggestions: the answers for the page you're on, before you've typed anything; on a page with none
// of its own (a ticket, My work…), the ones about working on tickets.
export function suggestions(entries: HelpEntry[], pathname: string, limit = 5): HelpEntry[] {
  const here = entries.filter((e) => e.pages.some((p) => p.test(pathname)));
  return (here.length > 0 ? here : entries.filter((e) => e.pages.length === 0)).slice(0, limit);
}

// hrefFor: the entry's link, with this page's project or board filled in.
export function hrefFor(e: HelpEntry, pathname: string): string {
  const project = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const board = pathname.match(/^\/boards\/([^/]+)/)?.[1];
  if (e.href.includes('[project]')) return project ? e.href.replace('[project]', project) : (e.fallback ?? '/dashboard');
  if (e.href.includes('[board]')) return board ? e.href.replace('[board]', board) : (e.fallback ?? '/dashboard');
  return e.href;
}

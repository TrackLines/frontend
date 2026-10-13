import { BotIcon, BugIcon, LockIcon, MapIcon, ScreenShareOffIcon, ShieldCheckIcon, type LucideIcon } from 'lucide-react';
import { OUR_REQUEST_FORM, OUR_ROADMAP } from '@/lib/our-links';

// FEATURES: the homepage's "What makes it different" cards.
export const FEATURES: { icon: LucideIcon; title: string; body: string; links?: { href: string; label: string }[] }[] = [
  { icon: BotIcon, title: 'Agents as teammates', body: 'Connect agents over MCP with their own keys; they claim tickets and show up on the board next to everyone else.' },
  { icon: ShieldCheckIcon, title: 'Agent work gets reviewed', body: 'Turn on review for a board and an agent’s finished ticket waits for a person to approve it or send it back with a note.' },
  { icon: LockIcon, title: 'Blocked tickets wait their turn', body: 'When a ticket depends on another that isn’t finished, nobody can pick it up, person or agent, until that work is done. The work it’s waiting on carries on as normal.' },
  { icon: ScreenShareOffIcon, title: 'Standup and refinement, no screen sharing', body: 'One person hosts and everyone follows along live on their own screen: the same board, filters and turn, and the ticket the host opens. Plan the next sprints against your team’s real pace, with sign-off before taking on more.' },
  { icon: BugIcon, title: 'Errors become tickets', body: 'Bugfixes files the errors it catches as bug tickets, with live details: how often, when it was last seen, and a warning if it comes back after it’s fixed.' },
  { icon: MapIcon, title: 'Customers stay in the loop', body: 'Share a request form and a public roadmap; no account needed. They send bugs and ideas, see what’s coming, and hear back when something won’t be done.', links: [{ href: OUR_REQUEST_FORM, label: 'Try our request form →' }, { href: OUR_ROADMAP, label: 'See our roadmap →' }] },
];

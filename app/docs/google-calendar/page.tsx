import type { Metadata } from 'next';
import Link from 'next/link';
import { B, Guide, H2, Items, P, Steps } from '@/components/docs/prose';

export const metadata: Metadata = {
  title: 'Google Calendar · TrackLin.es docs',
  description: 'Connect your Google Workspace so TrackLin.es knows who’s on holiday: in the assignee picker, on tickets and in standup.',
};

// CALENDAR_SCOPE: the one scope an admin authorizes (backend integrations.calendarScope).
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

// Google Calendar, for an organization admin (TL-411).
export default function GoogleCalendarDocs() {
  return (
    <Guide
      title="Google Calendar"
      intro={<>Connect your Google Workspace and TrackLin.es knows who’s on holiday, from their <B>Out of office</B> events: work isn’t handed to someone who’s off, and standup skips them. You need to be an organization admin in TrackLin.es, and a Google Workspace admin for step 1.</>}
    >
      <H2>1. Let TrackLin.es read calendars, in Google</H2>
      <Steps>
        <li>In TrackLin.es, open Organization settings → <B>Integrations</B> → <B>Calendars</B>. The Google Calendar card shows our <B>Client ID</B> and the scope, each with a Copy button.</li>
        <li>In admin.google.com, open <B>Security → API controls → Domain-wide delegation</B> and choose <B>Add new</B>.</li>
        <li>Paste the Client ID, and for OAuth scopes paste <code>{CALENDAR_SCOPE}</code>. Authorize. It can take a few minutes to apply.</li>
      </Steps>
      <P>That one scope is read-only: TrackLin.es can read calendars and nothing else, and can’t create, change or delete events.</P>

      <H2>2. Connect it in TrackLin.es</H2>
      <Items>
        <li><B>Workspace domain</B>: e.g. example.com.</li>
        <li><B>Admin email</B>: a user in that domain. We use it to check access, and to read the company days off calendar.</li>
        <li><B>Company days off</B> (optional): a shared calendar whose all-day events are days everyone’s off, such as your own office closures, or a public one like UK bank holidays (the card fills that in for you).</li>
      </Items>
      <P>
        Click <B>Connect</B>. We ask Google first, so if delegation isn’t set up yet, or the email isn’t a user in your Workspace, you’ll
        see what to fix and nothing is saved. Once connected, people’s time away syncs straight away and then every hour; <B>Sync now</B>
        and <B>Test connection</B> are on the card.
      </P>

      <H2>What changes</H2>
      <Items>
        <li><B>Assigning work:</B> people on holiday show “on holiday until Fri 23 Oct” in the assignee picker, and leave coming up this week shows too (“off from Thu”). You can still assign them; the ticket says they’re away.</li>
        <li><B>Faces:</B> on tickets and in standup, someone who’s away is faded, with when they’re back on hover.</li>
        <li><B>Standup:</B> people who are away keep their place, marked <B>On holiday</B>, and <B>Next</B> skips them. The host can still go to them.</li>
        <li><B>AI agents:</B> they’re told who’s away, and not to give them work unless asked (<Link href="/docs/mcp" className="underline">Connect an AI agent</Link>).</li>
      </Items>

      <H2>What we read, and what we keep</H2>
      <Items>
        <li>We read only each person’s <B>Out of office</B> events, from their own calendar, and the all-day events on the company days off calendar.</li>
        <li>We keep only <B>when</B> someone is away: the start and end. Never the event’s title, description, location or who else is invited; we don’t even ask Google for them.</li>
        <li>People are matched by their email address in your Workspace domain. Anyone without one is left out.</li>
        <li>Someone who leaves your organization takes their time away with them. Disconnecting deletes everyone’s.</li>
      </Items>

      <H2>Disconnecting</H2>
      <P>
        <B>Disconnect</B> on the card stops the sync and deletes all the time away TrackLin.es has for your organization. To stop Google
        too, remove our Client ID from Domain-wide delegation in admin.google.com.
      </P>
    </Guide>
  );
}

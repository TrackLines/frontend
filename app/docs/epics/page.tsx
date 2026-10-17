import type { Metadata } from 'next';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const metadata: Metadata = {
  title: 'Epics · TrackLin.es docs',
  description: 'How epics differ from normal tickets, and using them on boards and roadmaps.',
};

// differences: epics next to normal tickets (TL-212).
export const differences = [
  { what: 'Where it lives', ticket: 'On a board, or in the backlog until it’s moved to one', epic: 'Always in the backlog; it can’t be moved onto a board or planned into a sprint' },
  { what: 'Estimate', ticket: 'Its own, on the board’s scale', epic: 'None; its size is the total of its sub-tickets’ estimates' },
  { what: 'Progress', ticket: 'Done or not', epic: '“3 of 5 done · 13 points · 2 not sized”, from its sub-tickets' },
  { what: 'Sub-tickets', ticket: 'Can have them, usually on the same board', epic: 'Expected to have them, on any board or the backlog; its page groups them by board' },
  { what: 'Nesting', ticket: 'Can sit under another ticket', epic: 'Can’t sit anywhere inside another epic, however deep' },
  { what: 'Finishing', ticket: 'Moved to Done, or closed in the backlog', epic: 'Closes by itself when all its sub-tickets are done, or you can close it by hand' },
  { what: 'Leaving a board', ticket: 'Its unfinished sub-tickets on that board go with it', epic: 'Converting a ticket to an epic sends only the epic to the backlog; its sub-tickets stay on their boards' },
];

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-10 text-xl font-semibold">{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="mt-2 text-muted-foreground">{children}</p>;
const Items = ({ children }: { children: React.ReactNode }) => <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-muted-foreground">{children}</ul>;

export default function EpicsDocs() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <article className="max-w-3xl">
        <Link href="/docs" className="text-sm text-muted-foreground hover:underline">← Docs</Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Epics</h1>
        <P>
          An epic is a ticket type for a large piece of work that spans boards: something you track rather than work on
          directly. The work lives in its sub-tickets, on whichever teams’ boards it belongs; the epic shows how far that
          work has got.
        </P>

        <H2>Epics and normal tickets</H2>
        <div className="mt-4 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Normal ticket (bug, feature, task)</TableHead>
                <TableHead>Epic</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {differences.map((d) => (
                <TableRow key={d.what}>
                  <TableCell className="align-top font-medium">{d.what}</TableCell>
                  <TableCell className="align-top whitespace-normal text-muted-foreground">{d.ticket}</TableCell>
                  <TableCell className="align-top whitespace-normal text-muted-foreground">{d.epic}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <P>
          Otherwise an epic is a ticket like any other: a key (e.g. TL-412), title, description, labels, priority, comments,
          attachments and history, and AI agents work with it through the same tools.
        </P>
        <P>
          <strong className="text-foreground">When to use which:</strong> a normal parent ticket when the work belongs to one
          team on one board; an epic when the work spans teams or sprints and you want to see its progress overall.
        </P>

        <H2>Making an epic</H2>
        <Items>
          <li>Choose <strong className="text-foreground">Epic</strong> as the type when adding to the backlog, from <strong className="text-foreground">New ticket</strong>, or when editing any ticket. It isn’t offered when creating a ticket on a board.</li>
          <li><strong className="text-foreground">Converting a ticket:</strong> edit it and change its type to Epic. If it’s on a board, it moves to the backlog and loses its estimate; its sub-tickets stay where they are. A ticket with an epic above or below it can’t become one.</li>
          <li><strong className="text-foreground">Adding work:</strong> make tickets its sub-tickets, from any board or the backlog.</li>
        </Items>

        <H2>Where epics show up</H2>
        <Items>
          <li><strong className="text-foreground">Project page:</strong> an Epics tab beside the Backlog, each epic with a progress bar and its size.</li>
          <li><strong className="text-foreground">An epic’s page:</strong> its sub-tickets grouped by board (the backlog last), with its progress and size.</li>
          <li><strong className="text-foreground">Boards and the backlog:</strong> an Epic filter beside Priority shows only the work under one epic, at any depth. It’s kept in the page address, so a filtered view can be shared.</li>
          <li><strong className="text-foreground">Backlog:</strong> an Epics button in the type filter.</li>
        </Items>

        <H2>Epics on roadmaps</H2>
        <P>
          Link an epic to a roadmap milestone (<strong className="text-foreground">Link a ticket or epic…</strong>, then{' '}
          <strong className="text-foreground">Link an epic…</strong>) instead of linking each of its parts. The milestone then
          counts the epic’s sub-tickets, not the epic itself, worked out every time the roadmap loads, so work added to the
          epic later counts with nothing to relink.
        </P>
        <Items>
          <li>Epics and ordinary tickets can be linked to the same milestone. A ticket linked directly that’s also in a linked epic is counted once.</li>
          <li>It counts the epic’s direct sub-tickets, the same ones its own progress counts.</li>
          <li>Public roadmaps show the counts, never the tickets.</li>
        </Items>

        <H2>Moving a parent off its board</H2>
        <P>
          When a parent ticket leaves its board, its unfinished sub-tickets on that board, at any depth, go with it: to the
          backlog, or to the new board’s first column. Finished sub-tickets stay as the old board’s history, and ones on other
          boards stay with those teams.
        </P>
        <Items>
          <li>If any sub-ticket can’t move (the sprint ends today, the new board needs an estimate, or it’s waiting for review), nothing moves, and the message names that sub-ticket.</li>
          <li><strong className="text-foreground">Send to backlog</strong> says what will go with it before you confirm, e.g. “Sending it to the backlog also moves its 2 open sub-tickets on this board: TL-5, TL-6.”</li>
        </Items>

        <H2>For AI agents</H2>
        <P>
          Agents connected over MCP can list a project’s epics with progress (<code>list_epics</code>), filter the backlog and
          search by epic (<code>epic</code> on <code>list_backlog</code> and <code>search_tickets</code>), and link an epic to a
          milestone with <code>set_roadmap_item_tickets</code>, the same as a ticket.
        </P>
      </article>
    </main>
  );
}

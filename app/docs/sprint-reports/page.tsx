import type { Metadata } from 'next';
import Link from 'next/link';
import { B, Guide, H2, Items, P } from '@/components/docs/prose';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const metadata: Metadata = {
  title: 'Sprint reports · TrackLin.es docs',
  description: 'Reports on how a board, a project or the whole organization delivered over a period, with charts, to share with leadership as a PDF or Markdown.',
};

// MEASURES: what each number in a report means (TL-402), in the order the report shows them.
export const MEASURES = [
  { name: 'Planned', body: 'What a sprint held when it started.' },
  { name: 'Delivered (done)', body: 'What it finished by the time it closed.' },
  { name: 'Predictability', body: 'Delivered as a share of planned. 80–100% is on target: under means the team took on more than it finished; well over means more was added along the way than planned.' },
  { name: 'Velocity', body: 'Delivered per sprint, averaged over that sprint and the two before it.' },
  { name: 'Scope change', body: 'Work added after sprints started, as a share of what they planned.' },
  { name: 'Added / Removed', body: 'Tickets that joined a sprint after it started, or left it before it closed.' },
  { name: 'Carried over', body: 'What was unfinished at the end and moved on to the next sprint.' },
  { name: 'Work mix', body: 'What got done, by type: bugs, features and tasks, so you can see how much went on fixing versus building.' },
  { name: 'Goals met', body: 'A sprint with a goal met it when nothing carried over.' },
];

// Sprint reports, for whoever presents them (TL-402).
export default function SprintReportsDocs() {
  return (
    <Guide
      title="Sprint reports"
      intro={<>A sprint report shows how a board, a project or your whole organization delivered over a period: a one-line summary, headline numbers and charts, ready to share with leadership as a PDF or in a wiki as Markdown.</>}
    >
      <H2>Opening a report</H2>
      <Items>
        <li><B>A board:</B> open its <B>Past sprints</B> and choose <B>Sprint report</B>. Anyone in your organization.</li>
        <li><B>A project:</B> <B>Sprint report</B> at the top of the project page: all its sprint boards together. Anyone in your organization.</li>
        <li><B>The organization:</B> Settings → <B>Sprint report</B>: every project. Organization admins only.</li>
      </Items>
      <P>
        Pick a period: the last 30 or 90 days, this quarter, last quarter, or your own dates. Days follow your own time zone. The
        page’s address holds the report and its period, so you can send the link to someone in your organization.
      </P>

      <H2>What the numbers mean</H2>
      <div className="mt-4 rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Measure</TableHead><TableHead>What it is</TableHead></TableRow></TableHeader>
          <TableBody>
            {MEASURES.map((m) => (
              <TableRow key={m.name}>
                <TableCell className="align-top font-medium whitespace-normal">{m.name}</TableCell>
                <TableCell className="align-top whitespace-normal text-muted-foreground">{m.body}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <P>
        The headline cards compare against the period just before, of the same length, with an arrow up, down or level. A sprint
        still running shows as “so far” and isn’t counted in the totals.
      </P>

      <H2>Points, tickets and different boards</H2>
      <Items>
        <li>Boards that estimate count in <B>points</B> (T-shirt sizes are converted to points); boards that don’t count <B>tickets</B>.</li>
        <li>Project and organization reports never add points and tickets together: each has its own total. <B>Predictability</B> is a share, so it compares fairly across both.</li>
        <li>Different boards’ sprints don’t start on the same days, so project and organization trends are <B>by calendar month</B>. Each board or project links to its own report for the same period.</li>
      </Items>

      <H2>Sprints from before reports</H2>
      <P>
        Reports record what each sprint starts and ends with. For sprints that finished before that began, planned is what the sprint
        held when it closed, and what was added or removed isn’t known; they’re marked with an asterisk.
      </P>

      <H2>Why there are no per-person figures</H2>
      <P>
        Reports are about how teams deliver, never who did the most or least. Without knowing who was on holiday or off sick, numbers
        per person would be unfair and misleading, so reports only ever show boards, projects and the organization.
      </P>

      <H2>Presenting it</H2>
      <Items>
        <li><B>Export → Save as PDF (presentation):</B> a landscape document with a cover page, the summary and headline numbers, one chart per page, then the sprint goals and the detail. It always prints in the light theme.</li>
        <li><B>Download Markdown</B> or <B>Copy as Markdown:</B> the same report as text for a wiki, Notion, GitHub or Confluence. Its charts are Mermaid diagrams, which those tools (and Obsidian) draw as graphs; each has a table of its numbers underneath, so it reads anywhere.</li>
      </Items>

      <H2>For AI agents</H2>
      <P>
        Agents can fetch the same reports with <code>get_board_sprint_report</code> and <code>get_project_sprint_report</code>, as data
        or with <code>format: markdown</code> (<Link href="/docs/mcp" className="underline">Connect an AI agent</Link>). The
        organization report is for organization admins in the app.
      </P>
    </Guide>
  );
}

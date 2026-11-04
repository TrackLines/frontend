import type { Metadata } from 'next';
import Link from 'next/link';
import { B, Guide, H2, Items, P, Steps } from '@/components/docs/prose';

export const metadata: Metadata = {
  title: 'Feature flags with flags.gg · TrackLin.es docs',
  description: 'A ticket that needs a feature flag gets one in flags.gg, and the flag follows the ticket across the board.',
};

// what each move does to a ticket's flag (TL-796), as the backend does it (TL-787, TL-788)
export const lifecycle = [
  { when: 'The ticket goes onto a board', does: 'The flag is made in flags.gg, off, in the application’s first environment (usually dev).' },
  { when: 'It moves to a column set to Promote', does: 'The flag is added to the next environment, off. Testing and QA columns do this unless you set otherwise.' },
  { when: 'It moves to a column set to Promote to production', does: 'The flag is added to every environment left, up to production, off. The board’s Dev complete column does this unless you set otherwise.' },
  { when: 'The flag reaches production', does: 'A “Remove flag” ticket goes into the backlog, due after the project’s cleanup days (30 unless changed), for whoever had the ticket.' },
  { when: 'The “Remove flag” ticket is finished', does: 'The flag is archived in flags.gg, in every environment.' },
  { when: 'It moves back, or to the backlog', does: 'Nothing: flags.gg never takes a flag out of an environment.' },
  { when: 'It’s deleted, closed as won’t do, or marked a duplicate', does: 'The flag is archived.' },
];

// Feature flags: tickets and flags.gg (TL-796).
export default function FlagsDocs() {
  return (
    <Guide
      title="Feature flags with flags.gg"
      intro={<>Mark a ticket as needing a feature flag and TrackLin.es keeps its flag in <a href="https://flags.gg" className="underline">flags.gg</a> in step with the board: made when work starts, promoted through your environments as the ticket moves, and cleaned up once it’s live. Flags never turn on by themselves: you switch them on, from the ticket or in flags.gg.</>}
    >
      <H2>Connect flags.gg</H2>
      <Steps>
        <li>In flags.gg, open <B>Company → Integrations</B> and make an integration token. It starts <code>flg_</code> and is shown once.</li>
        <li>In TrackLin.es, an organization admin opens <B>Settings → Integrations → Feature flags</B>, pastes the token and clicks <B>Connect</B>. It’s checked with flags.gg, stored encrypted and never shown again.</li>
        <li>For each project, open <B>Edit project → Integrations → flags.gg</B> and pick the <B>Application</B> its flags go in. Set how many days after production the “Remove flag” ticket is due.</li>
      </Steps>
      <P>Connect a flags.gg company to one TrackLin.es organization only: flags are named after ticket keys, which are only unique within an organization.</P>

      <H2>Choose what each column does</H2>
      <P>On a board’s <B>Edit</B> page, each column has a <B>Flag</B> setting: Automatic, Nothing, Promote to the next environment, Promote to production, or Archive the flag. Automatic promotes from Testing or QA columns, and to production from the board’s Dev complete column. It says what it means next to each column.</P>

      <H2>Mark a ticket</H2>
      <Items>
        <li>On the ticket, tick <B>Needs a feature flag</B>. The flag’s name is the ticket’s key in lower case (<code>tl-123</code>) unless you give it another. That’s the name your code checks.</li>
        <li>The name can change until the flag is made. After that it’s locked.</li>
        <li>Agents connected over MCP see <code>needs_flag</code> and <code>flag_name</code> on the ticket, and put new code behind that flag.</li>
      </Items>

      <H2>What happens as the ticket moves</H2>
      <table className="mt-3 w-full text-sm">
        <thead><tr className="border-b text-left"><th className="py-2 pr-4 font-medium">When</th><th className="py-2 font-medium">What happens to the flag</th></tr></thead>
        <tbody>
          {lifecycle.map((l) => <tr key={l.when} className="border-b align-top"><td className="py-2 pr-4 font-medium">{l.when}</td><td className="py-2 text-muted-foreground">{l.does}</td></tr>)}
        </tbody>
      </table>
      <P>If flags.gg can’t be reached, the move still happens; the change is tried again until it works.</P>

      <H2>The flag panel</H2>
      <Items>
        <li>A ticket that needs a flag shows it in each environment: a switch where it has arrived, <B>Not yet</B> where it hasn’t. Switching it here is the same as in flags.gg.</li>
        <li>If flags.gg refused something, such as a flag with that name already existing, it says so on the ticket, and the card on the board shows a red flag.</li>
        <li><B>Remove flag</B> archives it in every environment. Only do it once your code no longer checks it.</li>
        <li>The terminal app and the phone apps show the flag too.</li>
      </Items>
      <P>
        See also <Link href="/docs/mcp" className="underline">Connect an AI agent</Link> for how agents work tickets that need a flag.
      </P>
    </Guide>
  );
}

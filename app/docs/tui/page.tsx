import type { Metadata } from 'next';
import Link from 'next/link';
import { B, Guide, H2, Items, P, Steps } from '@/components/docs/prose';

export const metadata: Metadata = {
  title: 'Terminal app · TrackLin.es docs',
  description: 'TrackLin.es in the terminal: My work, mentions, boards and backlogs, keyboard first.',
};

// TUI_REPO: the terminal app's source and releases.
export const TUI_REPO = 'https://github.com/TrackLines/tui';

// keys: what works where. The README in the repo has the full list.
export const keys = [
  { where: 'Everywhere', what: '1 My work · 2 Projects · 3–5 your most used projects · / search · t go to a ticket (TL-308) · esc or q back · Q quit · ? version, updates and keys' },
  { where: 'Lists', what: 'j/k move · g/G top/bottom · h/l slide a long title · enter open · r reload' },
  { where: 'Backlog', what: 'n new ticket · s sort · f filter by labels' },
  { where: 'Board', what: 'h/l column · j/k ticket · H/L move the ticket a column · n new ticket here · f follow a running standup or refinement' },
  { where: 'Ticket', what: 'e edit · m move · c comment · a assign to you' },
  { where: 'Writing', what: 'like vim: esc normal mode, :w save, :q leave (or keys = standard: ctrl+s save, esc cancel)' },
];

// The terminal app (TL-463): what it does, how to install it, its keys and config.
export default function TuiDocs() {
  return (
    <Guide
      title="Terminal app"
      intro={<>TrackLin.es in the terminal: My work, mentions, projects, boards and backlogs. Create, edit, move, assign and comment on tickets without leaving the keyboard. It uses your terminal’s colours, so it follows your theme. Source and releases: <a href={TUI_REPO} className="underline" target="_blank" rel="noopener noreferrer">github.com/TrackLines/tui</a>.</>}
    >
      <H2>Install</H2>
      <Steps>
        <li>Make a <B>Personal</B> key in <Link href="/account/api-keys" className="underline">Your settings → API keys</Link>. Leave <B>Read only</B> unticked to move and comment; a read-only key can still browse.</li>
        <li>Save it: <code>mkdir -p ~/.config/tracklines && echo &apos;tl_p_…&apos; &gt; ~/.config/tracklines/key && chmod 600 ~/.config/tracklines/key</code>. Or set <code>TRACKLINES_API_KEY</code>.</li>
        <li>Download it from <a href={`${TUI_REPO}/releases`} className="underline" target="_blank" rel="noopener noreferrer">Releases</a>, make it executable (<code>chmod +x</code>) and put it on your path. <B>Linux:</B> <code>tracklines-linux-amd64</code> or <code>tracklines-linux-arm64</code>. <B>macOS:</B> <code>tracklines-darwin-arm64</code> (Apple silicon) or <code>tracklines-darwin-amd64</code> (Intel). It isn’t signed, so if you download it in a browser, run <code>xattr -d com.apple.quarantine</code> on it before macOS will open it. On Windows, build it with Go: <code>go install github.com/tracklines/tui/cmd/tracklines@latest</code>.</li>
        <li>Run <code>tracklines</code>.</li>
      </Steps>

      <H2>Keys</H2>
      <P>Each screen lists its own keys at the bottom, and <code>?</code> shows the ones that work everywhere.</P>
      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
        {keys.map((k) => (
          <div key={k.where} className="contents">
            <dt className="font-medium">{k.where}</dt>
            <dd className="text-muted-foreground">{k.what}</dd>
          </div>
        ))}
      </dl>

      <H2>What it doesn’t do</H2>
      <P>It’s for the everyday work. You can follow a standup or refinement someone’s running, but hosting them, settings and API keys stay in the web app.</P>

      <H2>Config</H2>
      <P>Optional: <code>~/.config/tracklines/config</code>, one <code>name = value</code> per line (<a href={`${TUI_REPO}/blob/main/config.example`} className="underline" target="_blank" rel="noopener noreferrer">config.example</a> has them all).</P>
      <Items>
        <li><code>keys = vim</code> or <code>standard</code>: how writing tickets and comments works.</li>
        <li><code>backlog_sort = manual</code>, <code>newest</code> or <code>oldest</code>: the order a backlog opens in.</li>
        <li><code>update_check = on</code>: a release build looks for a newer one when it starts; <code>?</code> then <code>u</code> installs it, checked against the release’s checksums.</li>
        <li><code>reports = on</code>: the app’s own failures (the API unreachable, a crash) go to Bugfixes so they get fixed. Never your key, your searches or what you write. <code>off</code> stops it.</li>
      </Items>
    </Guide>
  );
}

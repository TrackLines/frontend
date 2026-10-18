import type { Metadata } from 'next';
import Link from 'next/link';
import { B, Guide, H2, Items, P, Steps } from '@/components/docs/prose';

export const metadata: Metadata = {
  title: 'TRMNL · TrackLin.es docs',
  description: 'Show your open TrackLin.es tickets on a TRMNL e-ink display.',
};

// TRMNL_RECIPE: the published TrackLin.es plugin on TRMNL.
export const TRMNL_RECIPE = 'https://trmnl.com/recipes/tracklin-es-511430';

// TRMNL: your open tickets (the same list as My work) on a TRMNL e-ink display, with a read-only
// personal key (TL-450).
export default function TrmnlDocs() {
  return (
    <Guide
      title="TRMNL"
      intro={<>Show your open tickets on a <a href="https://trmnl.com" className="underline" target="_blank" rel="noopener noreferrer">TRMNL</a> e-ink display: the same list as <B>My work</B>, across every board and project, most recently changed first.</>}
    >
      <H2>Set it up</H2>
      <Steps>
        <li>In TrackLin.es, open <Link href="/account/api-keys" className="underline">Your settings → API keys</Link> and make a <B>Personal</B> key, with <B>Read only</B> ticked. Copy it: it’s shown once.</li>
        <li>Open the <a href={TRMNL_RECIPE} className="underline" target="_blank" rel="noopener noreferrer">TrackLin.es plugin on TRMNL</a> and install it.</li>
        <li>Paste the key into <B>API key</B> and save. Your tickets show on the next refresh (every 15 minutes).</li>
      </Steps>

      <H2>What it shows</H2>
      <Items>
        <li>Each ticket’s key and title, and its column (or <B>Backlog</B>).</li>
        <li>A mark on high and urgent tickets, and on blocked ones.</li>
        <li>On the full screen and the tall half, the project and board too. Smaller layouts show fewer tickets.</li>
      </Items>

      <H2>Why a read-only personal key</H2>
      <P>A personal key is you, so the plugin shows the tickets assigned to you. Read only means TRMNL can see your tickets but never change anything. To stop it, revoke the key in Your settings; keys also expire, so make a new one when it does.</P>
    </Guide>
  );
}

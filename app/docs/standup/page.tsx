import type { Metadata } from 'next';
import { B, Guide, H2, Items, P, Steps } from '@/components/docs/prose';
import { REVIEW_MS, TURN_MS } from '@/lib/standup';

export const metadata: Metadata = {
  title: 'Standup · TrackLin.es docs',
  description: 'Run a daily standup on a board: everyone takes a turn with their tickets, then the team reviews the board together.',
};

const minutes = (ms: number) => `${ms / 60_000} minutes`;

// Standup, from a user's side: starting it, joining, taking turns, and what the host can do.
export default function StandupDocs() {
  return (
    <Guide
      title="Standup"
      intro={<>Standup runs your daily catch-up on the board itself. Everyone gets a turn with the board showing just their tickets, then the team looks at the whole board together. One person hosts; everyone else follows along on their own screen, live.</>}
    >
      <H2>Starting a standup</H2>
      <Steps>
        <li>Open the team’s board and click <B>Standup</B>. You’re the host.</li>
        <li>A panel opens beside the board with the clock and the running order: the board’s team, plus anyone (or any AI agent) with a ticket on it, by name.</li>
        <li>The clock waits while people join. When everyone’s here, press <B>Start</B>.</li>
      </Steps>

      <H2>Joining one</H2>
      <P>
        When a standup is running, the board’s button says <B>Join standup</B>. Join and you see what the host sees: the same
        turn, the same clock, the board filtered the way they have it, and any ticket they open shows on your screen too,
        read-only. A small <B>Live updates</B> note in the bottom-left corner shows you’re connected (it says <B>Reconnecting…</B> if the connection drops).
      </P>
      <Items>
        <li><B>Stop following</B> lets you look around the board on your own; <B>Follow host</B> takes you back.</li>
        <li><B>Leave standup</B> takes you out. The standup carries on for everyone else.</li>
        <li>The <B>who’s here</B> button in the header shows the host and everyone following.</li>
      </Items>

      <H2>Turns</H2>
      <Items>
        <li>Each person gets <B>{minutes(TURN_MS)}</B>, with the board showing only their tickets. The panel says whose turn it is (“Your turn” when it’s yours).</li>
        <li>When the time’s up the clock keeps going as <B>over by 0:30</B>, so nobody is cut off mid-sentence.</li>
        <li>After the last person comes the <B>board review</B>: <B>{minutes(REVIEW_MS)}</B> with every ticket showing, to talk about the board as a whole.</li>
      </Items>

      <H2>What the host can do</H2>
      <Items>
        <li><B>Pause</B> and resume the clock; <B>Next</B> and <B>Previous</B> to move between turns; click anyone’s name to jump to their turn.</li>
        <li><B>Assign work as you go:</B> drag someone’s face from the running order onto a ticket to give it to them. The running order stays as it is.</li>
        <li>Open a ticket to talk about it: it opens for everyone following.</li>
        <li><B>Hand over</B> to anyone who’s here, if someone else should run it.</li>
        <li><B>Finish</B> (or <B>End</B> early) closes the standup for everyone.</li>
      </Items>
      <P>Anyone on the board can start a standup; whoever starts it hosts until they hand over.</P>
    </Guide>
  );
}

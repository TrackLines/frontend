import type { Metadata } from 'next';
import { B, Guide, H2, Items, P, Steps } from '@/components/docs/prose';
import { MAX_PLANNED } from '@/lib/refinement';

export const metadata: Metadata = {
  title: 'Refinement · TrackLin.es docs',
  description: 'Plan the next sprints from the backlog, size tickets on each board’s scale, and keep sprints to what the team can do.',
};

// Refinement, from a user's side: planning sprints from the backlog, sizing, capacity and approval.
export default function RefinementDocs() {
  return (
    <Guide
      title="Refinement"
      intro={<>Refinement is where you plan the next sprints from the backlog: pick the tickets each team takes on next, size them, and check each sprint against how much the team usually gets done. Like standup, one person hosts and the rest of the team can follow along.</>}
    >
      <H2>Starting a refinement</H2>
      <Steps>
        <li>Open the project and click <B>Refine</B> on its backlog. You’re the host. (While one’s running, the button says <B>Join refinement</B>.)</li>
        <li>On the left is <B>To plan</B>: the backlog tickets not planned yet, with a priority filter. On the right, each sprint board with its planned sprints.</li>
        <li>Click <B>Done refining</B> when you’ve finished.</li>
      </Steps>
      <P>Organization admins and a board’s team leaders can host and change plans. Anyone can join and follow along.</P>

      <H2>Planning sprints</H2>
      <Items>
        <li><B>Plan sprint N</B> on a board adds the next sprint after its current one. Each board can plan up to {MAX_PLANNED} sprints ahead, and each can have a goal.</li>
        <li>Put a ticket in a sprint with the button for that board and sprint next to it. It stays in the backlog, marked as planned, until the sprint starts.</li>
        <li><B>Size it in place:</B> on a board that estimates, pick the estimate on that board’s scale (points or T-shirt sizes).</li>
        <li><B>Move out</B> takes it back to To plan. <B>Remove</B> drops a planned sprint, and its tickets go back to the backlog.</li>
        <li>Open any ticket to read or edit it without leaving refinement.</li>
      </Items>

      <H2>How full a sprint is</H2>
      <P>
        Each planned sprint shows how much is in it against the team’s capacity: its <B>velocity</B> (the average done in its
        last 3 sprints) <B>plus 10%</B>, in points, or in tickets on boards that don’t estimate. Unestimated tickets are counted
        so you can see what still needs sizing.
      </P>
      <Items>
        <li>A board with no finished sprints yet has no velocity, so there’s no limit.</li>
        <li>Going over marks the sprint <B>Needs approval</B>: an admin or the team leader can <B>Approve</B> it as it is, or you move tickets out.</li>
        <li>A sprint that still needs approval won’t start with its plan: it stays planned until it’s approved or brought back under.</li>
      </Items>

      <H2>When the sprint starts</H2>
      <P>
        Start the board’s next sprint, or let the current one run out, and its first planned sprint comes in: the planned tickets
        move onto the board’s first column, with their estimates, and the plan’s goal becomes the sprint’s goal. If the team still
        goes over what it can usually do, its admins and team leaders are told.
      </P>

      <H2>Following along</H2>
      <Items>
        <li>Everyone in the refinement sees plans change as the host makes them, live.</li>
        <li>When the host opens a ticket, it opens for everyone following, read-only, so you’re all looking at the same thing.</li>
        <li><B>Stop following</B>, <B>Follow host</B>, <B>Leave refinement</B> and <B>Hand over</B> work the same as in standup.</li>
      </Items>
    </Guide>
  );
}

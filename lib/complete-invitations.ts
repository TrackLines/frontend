import type { Invitation } from './api';

// completeInvitations finishes the invitations this person has already accepted in Clerk, so the
// inviter's list shows them accepted and team/project invites grant their access (TL-240). It used
// to need a second "Complete acceptance" press on organization settings, which nobody found.
// The server checks each one (verified email, accepted in Clerk, active membership) and refuses
// those not accepted in Clerk yet, so trying them all is safe. Returns the ids it completed.
export async function completeInvitations(mine: Invitation[], accept: (id: string) => Promise<unknown>): Promise<string[]> {
  const done: string[] = [];
  for (const invite of mine) {
    try {
      await accept(invite.id);
      done.push(invite.id);
    } catch {
      // not accepted in Clerk yet (409), or no longer valid: leave it for next time
    }
  }
  return done;
}

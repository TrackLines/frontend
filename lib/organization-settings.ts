import { ApiError, type Invitation, type OrganizationMember, type Project, type Team } from '@/lib/api';

// memberName: a member's real name, else their sign-in identifier (email).
export const memberName = (m: Pick<OrganizationMember, 'first_name' | 'last_name' | 'identifier'>) =>
  [m.first_name, m.last_name].filter(Boolean).join(' ') || m.identifier;

// personIn: how an id reads on the page: "Ava Smith (ava@x)", the identifier alone, or the raw id
// for someone who has left.
export function personIn(members: OrganizationMember[], userId: string): string {
  const m = members.find((item) => item.user_id === userId);
  if (!m) return userId;
  const name = [m.first_name, m.last_name].filter(Boolean).join(' ');
  return name ? `${name} (${m.identifier})` : m.identifier;
}

// adminSource: how someone became an admin: the Clerk seed ("initial admin: …") or who added them.
export const adminSource = (grantedBy: string, person: (id: string) => string) =>
  grantedBy.startsWith('clerk:') ? grantedBy.replace('clerk:', 'initial admin: ') : `added by ${person(grantedBy)}`;

// saveError: what a failed change says. Accepting an invitation before Clerk's step reads as a
// how-to; 403 = admins only; 409 carries the server's reason.
export function saveError(key: string, err: unknown): string {
  const status = err instanceof ApiError ? err.status : 0;
  if (key.startsWith('accept:') && (status === 403 || status === 409)) return 'Accept the Clerk email invitation first, then complete the TrackLines membership here.';
  if (status === 403) return 'Only organization admins can make this change.';
  if (status === 409) return (err as ApiError).message;
  return 'Couldn’t save that change. Please try again.';
}

// inviteInput: the invitation to send; team and project invitations need their target, the org one has none.
export const inviteInput = (email: string, scope: Invitation['scope'], target: string) =>
  ({ email_address: email.trim(), scope, ...(scope === 'organization' ? {} : { target_id: target }) });
export const inviteReady = (scope: Invitation['scope'], target: string) => scope === 'organization' || target !== '';

// targetName: the team or project an invitation is for (by name), falling back to its kind.
export function targetName(teams: Team[], projects: Project[], invitation: Pick<Invitation, 'scope' | 'target_id'>) {
  if (invitation.scope === 'team') return teams.find((t) => t.id === invitation.target_id)?.name ?? 'team';
  return projects.find((p) => p.id === invitation.target_id)?.name ?? 'project';
}

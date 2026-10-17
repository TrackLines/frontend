import { ApiError, invitations, organization, projects, teams, type Invitation, type OrgAdmin, type OrganizationMember, type Project, type Team, type TeamMember } from '@/lib/api';

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
  if (key.startsWith('accept:') && (status === 403 || status === 409)) return 'Accept the Clerk email invitation first, then complete the TrackLin.es membership here.';
  if (status === 403) return 'Only organization admins can make this change.';
  if (status === 409 || status === 422) return (err as ApiError).message; // 422: Clerk refused, with its reason (TL-239)
  if (status === 402) return 'Your plan includes up to 20 members, counting invitations not yet accepted. Upgrade to Enterprise in Settings for unlimited members.'; // TL-418
  return 'Couldn’t save that change. Please try again.';
}

// memberCount: the Members heading: "12 members", with the plan's limit when it has one, counting
// invitations not yet accepted (TL-418): "12 members and 1 invitation pending, of up to 20 on your plan".
export function memberCount(members: number, pending: number, limit: number | null | undefined): string {
  const people = `${members} member${members === 1 ? '' : 's'}`;
  if (limit == null || limit < 0) return people;
  const waiting = pending > 0 ? ` and ${pending} invitation${pending === 1 ? '' : 's'} pending` : '';
  return `${people}${waiting}, of up to ${limit} on your plan`;
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

// Each change's result shows in the section that started it, not at the top of a long page (TL-220).
export type Section = 'received' | 'members' | 'teams' | 'invites';
export type Outcome = { section: Section; ok: boolean; text: string };

// sectionOf: where an action's result belongs, from its key (invite, revoke:…, admin:…, accept:…,
// create-team, or a team's "<team id>:<action>").
export function sectionOf(key: string): Section {
  if (key === 'invite' || key.startsWith('revoke:')) return 'invites';
  if (key.startsWith('accept:')) return 'received';
  if (key.startsWith('admin:')) return 'members';
  return 'teams';
}

export type TeamState = { team: Team; members: TeamMember[] };
export type OrganizationData = {
  members: OrganizationMember[]; admins: OrgAdmin[]; teams: TeamState[]; projects: Project[];
  projectTeams: Record<string, Team[]>; isAdmin: boolean; userId: string; leads: string[];
};
const defaultApi = { organization, teams, projects, invitations };

// fetchOrganization starts every request for the organization page at once, each list as soon as
// what it needs arrives (TL-263). Invitations are separate so the page draws without waiting for them;
// sent invitations are fetched for admins only.
export function fetchOrganization(t: string, api: typeof defaultApi = defaultApi) {
  const role = api.organization.me(t);
  const received = api.invitations.mine(t);
  const sent = role.then((r) => (r.admin ? api.invitations.list(t) : []));
  const data = Promise.all([
    api.organization.members(t).then(async (first) => {
      const pages = Math.ceil(Math.max(0, first.total_count - first.members.length) / first.limit);
      const rest = await Promise.all(Array.from({ length: pages }, (_, i) => api.organization.members(t, first.offset + first.limit * (i + 1))));
      return [...first.members, ...rest.flatMap((page) => page.members)];
    }),
    role,
    api.teams.list(t).then((list) => Promise.all(list.map(async (team) => ({ team, members: await api.teams.members(team.id, t) })))),
    api.projects.list(t).then(async (list) => ({
      list, teams: Object.fromEntries(await Promise.all(list.map(async (p) => [p.id, await api.teams.projectTeams(p.id, t)] as const))),
    })),
    api.organization.admins(t),
  ]).then(([members, me, teamStates, p, admins]): OrganizationData => ({
    members, admins, teams: teamStates, projects: p.list, projectTeams: p.teams, isAdmin: me.admin, userId: me.user_id, leads: me.leads,
  }));
  return { data, received, sent };
}

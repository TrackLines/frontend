'use client';

import { ListPageSkeleton } from '@/components/page-skeletons';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError, invitations, organization, projects as projectApi, teams as teamApi, type Invitation, type OrganizationMember, type OrgAdmin, type Project, type Team, type TeamMember } from '@/lib/api';
import { useToken } from '@/lib/use-token';

type TeamState = { team: Team; members: TeamMember[] };
type PageData = {
  members: OrganizationMember[]; admins: OrgAdmin[]; teams: TeamState[]; projects: Project[];
  projectTeams: Record<string, Team[]>; invites: Invitation[]; isAdmin: boolean; userId: string; leads: string[];
};

const card = 'rounded-xl border p-5';
const NO_TARGET = '__none';

export default function OrganizationSettingsPage() {
  const token = useToken();
  const [data, setData] = useState<PageData | null>(null);
  const [receivedInvites, setReceivedInvites] = useState<Invitation[]>([]);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteScope, setInviteScope] = useState<Invitation['scope']>('organization');
  const [inviteTarget, setInviteTarget] = useState('');

  async function load(currentToken: string) {
    setLoadError('');
    try { setReceivedInvites(await invitations.mine(currentToken)); }
    catch { setReceivedInvites([]); }
    try {
      const [firstMembers, role, teamList, projectList] = await Promise.all([
        organization.members(currentToken), organization.me(currentToken), teamApi.list(currentToken), projectApi.list(currentToken),
      ]);
      const remainingMembers = await Promise.all(Array.from({ length: Math.ceil(Math.max(0, firstMembers.total_count - firstMembers.members.length) / firstMembers.limit) }, (_, index) => organization.members(currentToken, firstMembers.offset + firstMembers.limit * (index + 1))));
      const allMembers = [...firstMembers.members, ...remainingMembers.flatMap((page) => page.members)];
      const teamStates = await Promise.all(teamList.map(async (team) => ({ team, members: await teamApi.members(team.id, currentToken) })));
      const projectTeamLists = await Promise.all(projectList.map(async (project) => [project.id, await teamApi.projectTeams(project.id, currentToken)] as const));
      const common = { members: allMembers, teams: teamStates, projects: projectList, projectTeams: Object.fromEntries(projectTeamLists), isAdmin: role.admin, userId: role.user_id, leads: role.leads };
      const admins = await organization.admins(currentToken);
      const invites = role.admin ? await invitations.list(currentToken) : [];
      setData({ ...common, admins, invites });
    } catch (err) {
      setLoadError(err instanceof ApiError && err.status === 403 ? 'Choose an organization to manage its members and teams.' : 'Couldn’t load organization settings. Please try again.');
    }
  }

  useEffect(() => { if (token) void load(token); }, [token]);

  async function run(key: string, action: () => Promise<unknown>, success?: string) {
    if (!token) return;
    setBusy(key); setError(''); setNotice('');
    try {
      await action();
      await load(token);
      if (success) setNotice(success);
    } catch (err) {
      setError(key.startsWith('accept:') && err instanceof ApiError && (err.status === 403 || err.status === 409) ? 'Accept the Clerk email invitation first, then complete the TrackLines membership here.' : err instanceof ApiError && err.status === 403 ? 'Only organization admins can make this change.' : err instanceof ApiError && err.status === 409 ? err.message : 'Couldn’t save that change. Please try again.');
    } finally { setBusy(''); }
  }

  function person(userId: string) {
    const member = data?.members.find((item) => item.user_id === userId);
    if (!member) return userId;
    const name = [member.first_name, member.last_name].filter(Boolean).join(' ');
    return name ? `${name} (${member.identifier})` : member.identifier;
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run('create-team', () => teamApi.create(newTeamName, newTeamDescription, token!), 'Team created.');
    setNewTeamName(''); setNewTeamDescription('');
  }

  async function sendInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { email_address: inviteEmail.trim(), scope: inviteScope, ...(inviteScope === 'organization' ? {} : { target_id: inviteTarget }) };
    await run('invite', () => invitations.create(input, token!), 'Invitation sent.');
    setInviteEmail('');
  }

  if (!token) return <ListPageSkeleton label="Loading organization settings…" sections={2} />;
  if (loadError && !data) return <main className="mx-auto max-w-6xl px-6 py-10"><Link href="/settings" className="text-sm text-muted-foreground hover:underline">← Settings</Link><h1 className="mt-2 mb-6 text-3xl font-bold tracking-tight">Organization</h1>{error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}<ReceivedInvitations items={receivedInvites} token={token} run={run} /><p role="alert" className="mt-6 text-sm text-muted-foreground">{loadError}</p></main>;
  if (!data) return <ListPageSkeleton label="Loading members and teams…" sections={2} />;

  const administrators = new Set(data.admins.map((admin) => admin.user_id));
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← Settings</Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">View organization members, teams, and who can manage them.</p>
      </header>
      {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">{notice}</p>}

      <ReceivedInvitations items={receivedInvites} token={token} run={run} />

      <section className={card}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Members</h2><p className="text-sm text-muted-foreground">{data.members.length} of the organization’s members</p></div>
          {data.isAdmin && <Badge>Organization admin</Badge>}
        </div>
        {data.members.length === 0 ? <p className="text-sm text-muted-foreground">No members found.</p> : (
          <ul className="divide-y">
            {data.members.map((member) => {
              const teams = data.teams.filter(({ members }) => members.some((item) => item.user_id === member.user_id));
              const leaderOf = teams.filter(({ members }) => members.some((item) => item.user_id === member.user_id && item.leader));
              return <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="font-medium">{[member.first_name, member.last_name].filter(Boolean).join(' ') || member.identifier}</p><p className="text-xs text-muted-foreground">{member.identifier}</p></div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {administrators.has(member.user_id) && <Badge variant="secondary">Admin</Badge>}
                  {leaderOf.map(({ team }) => <Badge key={team.id} variant="outline">{team.name} leader</Badge>)}
                  {teams.filter(({ members }) => !members.some((item) => item.user_id === member.user_id && item.leader)).map(({ team }) => <Badge key={team.id} variant="outline">{team.name}</Badge>)}
                  {data.isAdmin && <Button size="xs" variant="ghost" disabled={busy.includes(`admin:${member.user_id}`)} onClick={() => void run(`admin:${member.user_id}`, () => administrators.has(member.user_id) ? organization.revokeAdmin(member.user_id, token) : organization.grantAdmin(member.user_id, token), administrators.has(member.user_id) ? 'Organization admin removed.' : 'Organization admin assigned.')}>{administrators.has(member.user_id) ? 'Remove admin' : 'Make admin'}</Button>}
                </div>
              </li>;
            })}
          </ul>
        )}
      </section>

      <section className={`${card} mt-6`}>
        <div className="mb-4"><h2 className="text-lg font-semibold">Teams</h2><p className="text-sm text-muted-foreground">Teams connect members to project boards.</p></div>
        {data.teams.length === 0 && <p className="mb-4 text-sm text-muted-foreground">No teams yet.</p>}
        <div className="space-y-4">
          {data.teams.map(({ team, members }) => <article key={team.id} className="rounded-lg border p-4">
            <TeamEditor team={team} members={members} people={data.members} projects={data.projects} projectTeams={data.projectTeams} isAdmin={data.isAdmin} token={token} busy={busy} person={person}
              onChange={(key, action, success) => run(`${team.id}:${key}`, action, success)} />
          </article>)}
        </div>
        {data.isAdmin && <form onSubmit={createTeam} className="mt-5 grid gap-2 border-t pt-5 sm:grid-cols-[1fr_2fr_auto]">
          <Input aria-label="New team name" value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} required maxLength={100} placeholder="Team name" />
          <Input aria-label="Team description" value={newTeamDescription} onChange={(event) => setNewTeamDescription(event.target.value)} maxLength={500} placeholder="Description (optional)" />
          <Button disabled={busy === 'create-team'}>{busy === 'create-team' ? 'Creating…' : 'Create team'}</Button>
        </form>}
      </section>

      {data.isAdmin && <section className={`${card} mt-6`}>
        <div className="mb-4"><h2 className="text-lg font-semibold">Invite people</h2><p className="text-sm text-muted-foreground">Invitations are sent by email and expire after seven days.</p></div>
        <form onSubmit={sendInvite} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <Input type="email" aria-label="Email address" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required placeholder="name@example.com" />
          <Select value={inviteScope} onValueChange={(value) => { if (value) { setInviteScope(value as Invitation['scope']); setInviteTarget(''); } }}>
            <SelectTrigger aria-label="Invitation scope" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="organization">Organization</SelectItem><SelectItem value="team">Team</SelectItem><SelectItem value="project">Project</SelectItem></SelectContent>
          </Select>
          {inviteScope !== 'organization' ? <Select value={inviteTarget || NO_TARGET} onValueChange={(value) => setInviteTarget(value === NO_TARGET || !value ? '' : value)}>
            <SelectTrigger aria-label="Invitation target" className="w-full"><SelectValue placeholder={`Choose ${inviteScope}`} /></SelectTrigger>
            <SelectContent><SelectItem value={NO_TARGET}>Choose {inviteScope}</SelectItem>
              {(inviteScope === 'team' ? data.teams.map(({ team }) => team) : data.projects).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select> : <span />}
          <Button disabled={busy === 'invite' || (inviteScope !== 'organization' && !inviteTarget)}>{busy === 'invite' ? 'Sending…' : 'Send invite'}</Button>
        </form>
        <div className="mt-5 border-t pt-4">
          <h3 className="mb-2 font-medium">Invitations</h3>
          {data.invites.length === 0 ? <p className="text-sm text-muted-foreground">No invitations yet.</p> : <ul className="divide-y">
            {data.invites.map((invite) => <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div><p className="font-medium">{invite.email_address}</p><p className="text-muted-foreground">{invite.scope}{invite.target_id ? ` · ${targetName(data, invite)}` : ''} · expires {new Date(invite.expires_at).toLocaleDateString()}</p></div>
              <div className="flex items-center gap-2"><Badge variant={invite.status === 'pending' ? 'secondary' : 'outline'}>{invite.status}</Badge>
                {invite.status === 'pending' && <Button size="sm" variant="outline" disabled={busy === `revoke:${invite.id}`} onClick={() => void run(`revoke:${invite.id}`, () => invitations.revoke(invite.id, token), 'Invitation revoked.')}>Revoke</Button>}
                {invite.accept_url && <a className="text-xs underline" href={invite.accept_url} target="_blank" rel="noreferrer">Open invite</a>}
              </div>
            </li>)}
          </ul>}
        </div>
      </section>}

      {data.isAdmin && <section className={`${card} mt-6`}>
        <h2 className="text-lg font-semibold">Organization admins</h2><p className="mb-3 text-sm text-muted-foreground">The organization creator starts as its first admin.</p>
        <ul className="divide-y">{data.admins.map((admin) => <li key={admin.user_id} className="py-2 text-sm">{person(admin.user_id)} <span className="text-muted-foreground">· {admin.granted_by.startsWith('clerk:') ? admin.granted_by.replace('clerk:', 'initial admin: ') : `added by ${person(admin.granted_by)}`}</span></li>)}</ul>
      </section>}
    </main>
  );
}

function targetName(data: PageData, invitation: Invitation) {
  if (invitation.scope === 'team') return data.teams.find(({ team }) => team.id === invitation.target_id)?.team.name ?? 'team';
  return data.projects.find((project) => project.id === invitation.target_id)?.name ?? 'project';
}

function ReceivedInvitations({ items, token, run }: { items: Invitation[]; token: string; run: (key: string, action: () => Promise<unknown>, success?: string) => Promise<void> }) {
  if (items.length === 0) return null;
  return <section className={`${card} mb-6`}>
    <h2 className="text-lg font-semibold">Invitations for you</h2>
    <p className="mb-3 text-sm text-muted-foreground">Accept the Clerk email invitation first, then complete the TrackLines membership here.</p>
    <ul className="divide-y">{items.map((invite) => <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <div><p className="font-medium">{invite.scope} invitation</p><p className="text-muted-foreground">Expires {new Date(invite.expires_at).toLocaleDateString()}</p></div>
      <div className="flex gap-2"><a className="inline-flex h-8 items-center rounded-lg border px-2.5 text-sm hover:bg-muted" href={invite.accept_url} target="_blank" rel="noreferrer">Accept in Clerk</a><Button size="sm" variant="outline" onClick={() => void run(`accept:${invite.id}`, () => invitations.accept(invite.id, token), 'Invitation accepted.')}>Complete acceptance</Button></div>
    </li>)}</ul>
  </section>;
}

function TeamEditor({ team, members, people, projects, projectTeams, isAdmin, token, busy, person, onChange }: {
  team: Team; members: TeamMember[]; people: OrganizationMember[]; projects: Project[]; projectTeams: Record<string, Team[]>;
  isAdmin: boolean; token: string; busy: string; person: (id: string) => string;
  onChange: (key: string, action: () => Promise<unknown>, success?: string) => void;
}) {
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description);
  const [memberToAdd, setMemberToAdd] = useState('');
  useEffect(() => { setName(team.name); setDescription(team.description); }, [team.name, team.description]);
  const memberIds = new Set(members.map((member) => member.user_id));
  const available = people.filter((member) => !memberIds.has(member.user_id));
  const linkedProjects = projects.filter((project) => projectTeams[project.id]?.some((item) => item.id === team.id));
  return <>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-48 flex-1">
        {isAdmin ? <div className="grid gap-2 sm:grid-cols-2"><Input aria-label={`${team.name} team name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={100} /><Input aria-label={`${team.name} description`} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="Description" /></div> : <><h3 className="font-semibold">{team.name}</h3>{team.description && <p className="mt-1 text-sm text-muted-foreground">{team.description}</p>}</>}
      </div>
      {isAdmin && <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy === `${team.id}:save`} onClick={() => onChange('save', () => teamApi.update(team.id, name, description, token), 'Team updated.')}>Save</Button><Button size="sm" variant="destructive" disabled={busy === `${team.id}:delete`} onClick={() => { if (window.confirm(`Delete the ${team.name} team?`)) onChange('delete', () => teamApi.remove(team.id, token), 'Team deleted.'); }}>Delete</Button></div>}
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Members</p>
        {members.length === 0 ? <p className="text-sm text-muted-foreground">No members yet.</p> : <ul className="space-y-2">{members.map((member) => <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>{person(member.user_id)}{member.leader && <Badge className="ml-2" variant="secondary">Leader</Badge>}</span>
          {isAdmin && <div className="flex gap-1"><Button size="xs" variant="ghost" disabled={busy.includes(`${team.id}:`)} onClick={() => onChange('leader', () => member.leader ? teamApi.removeLeader(team.id, member.user_id, token) : teamApi.addLeader(team.id, member.user_id, token), member.leader ? 'Team leader removed.' : 'Team leader assigned.')}>{member.leader ? 'Remove leader' : 'Make leader'}</Button><Button size="xs" variant="ghost" className="text-destructive" disabled={busy.includes(`${team.id}:`)} onClick={() => onChange('member', () => teamApi.removeMember(team.id, member.user_id, token), 'Member removed from team.')}>Remove</Button></div>}
        </li>)}</ul>}
        {isAdmin && <div className="mt-3 flex gap-2"><Select value={memberToAdd || NO_TARGET} onValueChange={(value) => setMemberToAdd(value === NO_TARGET || !value ? '' : value)}>
          <SelectTrigger aria-label={`Add member to ${team.name}`} className="min-w-0 flex-1"><SelectValue placeholder="Add organization member…" /></SelectTrigger>
          <SelectContent><SelectItem value={NO_TARGET}>Add organization member…</SelectItem>{available.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{[member.first_name, member.last_name].filter(Boolean).join(' ') || member.identifier} · {member.identifier}</SelectItem>)}</SelectContent>
        </Select><Button size="sm" disabled={!memberToAdd || busy.includes(`${team.id}:`)} onClick={() => onChange('member', () => teamApi.addMember(team.id, memberToAdd, token), 'Member added to team.')}>Add</Button></div>}
      </div>
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project boards</p>
        {projects.length === 0 ? <p className="text-sm text-muted-foreground">Create a project before linking this team.</p> : <ul className="space-y-2">{projects.map((project) => {
          const linked = projectTeams[project.id]?.some((item) => item.id === team.id) ?? false;
          return <li key={project.id} className="flex items-center justify-between gap-3 text-sm"><span>{project.name}</span><Button type="button" size="sm" variant={linked ? 'secondary' : 'outline'} aria-pressed={linked} disabled={!isAdmin || busy.includes(`${team.id}:`)} onClick={() => onChange('project', () => linked ? teamApi.removeProject(project.id, team.id, token) : teamApi.addProject(project.id, team.id, token), linked ? 'Team unlinked from project.' : 'Team linked to project.')}>{linked ? 'Linked' : 'Link team'}</Button></li>;
        })}</ul>}
        {linkedProjects.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Boards linked to this team are managed by its leaders.</p>}
      </div>
    </div>
  </>;
}

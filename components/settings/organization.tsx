'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { invitations, teams as teamApi, type Invitation, type OrganizationMember, type Project, type Team, type TeamMember } from '@/lib/api';
import { memberName, type Outcome, type Section } from '@/lib/organization-settings';
import { dates } from '@/lib/i18n';

const card = 'rounded-xl border p-5';
const NO_TARGET = '__none';

// ReceivedInvitations: invitations addressed to me, accepted in Clerk then completed here.
export function ReceivedInvitations({ items, token, run }: { items: Invitation[]; token: string; run: (key: string, action: () => Promise<unknown>, success?: string) => Promise<unknown> }) {
  const { t, i18n } = useLingui();
  if (items.length === 0) return null;
  return <section className={`${card} mb-6`}>
    <h2 className="text-lg font-semibold"><Trans>Invitations for you</Trans></h2>
    <p className="mb-3 text-sm text-muted-foreground"><Trans>Accept the Clerk email invitation first, then complete the TrackLin.es membership here.</Trans></p>
    <ul className="divide-y">{items.map((invite) => <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <div><p className="font-medium"><Trans>{invite.scope} invitation</Trans></p><p className="text-muted-foreground"><Trans>Expires {dates(i18n, { day: 'numeric', month: 'numeric', year: 'numeric' }).format(new Date(invite.expires_at))}</Trans></p></div>
      <div className="flex gap-2"><a className="inline-flex h-8 items-center rounded-lg border px-2.5 text-sm hover:bg-muted" href={invite.accept_url} target="_blank" rel="noreferrer"><Trans>Accept in Clerk</Trans></a><Button size="sm" variant="outline" onClick={() => void run(`accept:${invite.id}`, () => invitations.accept(invite.id, token), t`Invitation accepted.`)}><Trans>Complete acceptance</Trans></Button></div>
    </li>)}</ul>
  </section>;
}

// TeamEditor: a team's name, members and leaders, and its projects. Only admins can change any of it.
export function TeamEditor({ team, members, people, projects, projectTeams, isAdmin, token, busy, person, onChange }: {
  team: Team; members: TeamMember[]; people: OrganizationMember[]; projects: Project[]; projectTeams: Record<string, Team[]>;
  isAdmin: boolean; token: string; busy: string; person: (id: string) => string;
  onChange: (key: string, action: () => Promise<unknown>, success?: string) => void;
}) {
  const { t } = useLingui();
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
        {isAdmin ? <div className="grid gap-2 sm:grid-cols-2"><Input aria-label={t`${team.name} team name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={100} /><Input aria-label={t`${team.name} description`} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder={t`Description`} /></div> : <><h3 className="font-semibold">{team.name}</h3>{team.description && <p className="mt-1 text-sm text-muted-foreground">{team.description}</p>}</>}
      </div>
      {isAdmin && <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy === `${team.id}:save`} onClick={() => onChange('save', () => teamApi.update(team.id, name, description, token), t`Team updated.`)}><Trans>Save</Trans></Button><Button size="sm" variant="destructive" disabled={busy === `${team.id}:delete`} onClick={() => { if (window.confirm(t`Delete the ${team.name} team?`)) onChange('delete', () => teamApi.remove(team.id, token), t`Team deleted.`); }}><Trans>Delete</Trans></Button></div>}
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Trans>Members</Trans></p>
        {members.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>No members yet.</Trans></p> : <ul className="space-y-2">{members.map((member) => <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>{person(member.user_id)}{member.leader && <Badge className="ml-2" variant="secondary"><Trans>Leader</Trans></Badge>}</span>
          {isAdmin && <div className="flex gap-1"><Button size="xs" variant="ghost" disabled={busy.includes(`${team.id}:`)} onClick={() => onChange('leader', () => member.leader ? teamApi.removeLeader(team.id, member.user_id, token) : teamApi.addLeader(team.id, member.user_id, token), member.leader ? t`Team leader removed.` : t`Team leader assigned.`)}>{member.leader ? <Trans>Remove leader</Trans> : <Trans>Make leader</Trans>}</Button><Button size="xs" variant="ghost" className="text-destructive" disabled={busy.includes(`${team.id}:`)} onClick={() => onChange('member', () => teamApi.removeMember(team.id, member.user_id, token), t`Member removed from team.`)}><Trans>Remove</Trans></Button></div>}
        </li>)}</ul>}
        {isAdmin && <div className="mt-3 flex gap-2"><Select items={{ [NO_TARGET]: t`Add organization member…`, ...Object.fromEntries(available.map((member) => [member.user_id, `${memberName(member)} · ${member.identifier}`])) }} value={memberToAdd || NO_TARGET} onValueChange={(value) => setMemberToAdd(value === NO_TARGET || !value ? '' : value)}>
          <SelectTrigger aria-label={t`Add member to ${team.name}`} className="min-w-0 flex-1"><SelectValue placeholder={t`Add organization member…`} /></SelectTrigger>
          <SelectContent><SelectItem value={NO_TARGET}><Trans>Add organization member…</Trans></SelectItem>{available.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{memberName(member)} · {member.identifier}</SelectItem>)}</SelectContent>
        </Select><Button size="sm" disabled={!memberToAdd || busy.includes(`${team.id}:`)} onClick={() => onChange('member', () => teamApi.addMember(team.id, memberToAdd, token), t`Member added to team.`)}><Trans>Add</Trans></Button></div>}
      </div>
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Trans>Project boards</Trans></p>
        {!isAdmin ? (linkedProjects.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>Not on any project yet.</Trans></p> : <ul className="space-y-1 text-sm">{linkedProjects.map((project) => <li key={project.id}>{project.name}</li>)}</ul>)
        : projects.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>Create a project before linking this team.</Trans></p> : <ul className="space-y-2">{projects.map((project) => {
          const linked = projectTeams[project.id]?.some((item) => item.id === team.id) ?? false;
          return <li key={project.id} className="flex items-center justify-between gap-3 text-sm"><span>{project.name}</span><Button type="button" size="sm" variant={linked ? 'secondary' : 'outline'} aria-pressed={linked} disabled={busy.includes(`${team.id}:`)} onClick={() => onChange('project', () => linked ? teamApi.removeProject(project.id, team.id, token) : teamApi.addProject(project.id, team.id, token), linked ? t`Team unlinked from project.` : t`Team linked to project.`)}>{linked ? <Trans>Linked</Trans> : <Trans>Link team</Trans>}</Button></li>;
        })}</ul>}
        {linkedProjects.length > 0 && <p className="mt-2 text-xs text-muted-foreground"><Trans>Boards linked to this team are managed by its leaders.</Trans></p>}
      </div>
    </div>
  </>;
}

// OutcomeNote: a change's result, shown in the section where it was made.
export function OutcomeNote({ outcome, section }: { outcome: Outcome | null; section: Section }) {
  if (!outcome || outcome.section !== section) return null;
  return outcome.ok
    ? <p role="status" className="mb-3 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">{outcome.text}</p>
    : <p role="alert" className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{outcome.text}</p>;
}

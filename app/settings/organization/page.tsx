'use client';

import { ListPageSkeleton } from '@/components/page-skeletons';
import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError, billing, invitations, organization, teams as teamApi, type Invitation } from '@/lib/api';
import { useToken } from '@/lib/use-token';
import { OutcomeNote, ReceivedInvitations, TeamEditor } from '@/components/settings/organization';
import { adminSource, fetchOrganization, type OrganizationData, inviteInput, memberCount, inviteReady, memberName, personIn, saveError, sectionOf, targetName, type Outcome } from '@/lib/organization-settings';
import { dates } from '@/lib/i18n';

const card = 'rounded-xl border p-5';
const NO_TARGET = '__none';

export default function OrganizationSettingsPage() {
  const token = useToken();
  const { t, i18n } = useLingui();
  const [data, setData] = useState<OrganizationData | null>(null);
  const [receivedInvites, setReceivedInvites] = useState<Invitation[]>([]);
  const [sentInvites, setSentInvites] = useState<Invitation[] | null>(null); // null while loading
  const [loadError, setLoadError] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null); // shown in the section where the change was made
  const [busy, setBusy] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [memberLimit, setMemberLimit] = useState<number | null>(null); // the plan's (TL-418); -1 unlimited
  const [inviteScope, setInviteScope] = useState<Invitation['scope']>('organization');
  const [inviteTarget, setInviteTarget] = useState('');

  async function load(tok: string) {
    setLoadError('');
    const { data: next, received, sent } = fetchOrganization(tok);
    received.then(setReceivedInvites, () => setReceivedInvites([]));
    sent.then(setSentInvites, () => setSentInvites([]));
    try {
      setData(await next);
    } catch (err) {
      setLoadError(err instanceof ApiError && err.status === 403 ? t`Choose an organization to manage its members and teams.` : t`Couldn’t load organization settings. Please try again.`);
    }
  }

  const signedIn = token !== null;
  useEffect(() => { if (token) void load(token); }, [signedIn]); // token refreshes must not reload the page
  useEffect(() => { if (token) billing.status(token).then((s) => setMemberLimit(s.member_limit ?? null), () => setMemberLimit(null)); }, [signedIn]);

  // run makes a change, reloads, and reports where it was made; true when it worked.
  async function run(key: string, action: () => Promise<unknown>, success?: string): Promise<boolean> {
    if (!token) return false;
    const section = sectionOf(key);
    setBusy(key); setOutcome(null);
    try {
      await action();
      await load(token);
      if (success) setOutcome({ section, ok: true, text: success });
      return true;
    } catch (err) {
      setOutcome({ section, ok: false, text: saveError(i18n, key, err) });
      return false;
    } finally { setBusy(''); }
  }

  const person = (userId: string) => personIn(data?.members ?? [], userId);

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await run('create-team', () => teamApi.create(newTeamName, newTeamDescription, token!), t`Team created.`)) {
      setNewTeamName(''); setNewTeamDescription('');
    }
  }

  async function sendInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = inviteInput(inviteEmail, inviteScope, inviteTarget);
    if (await run('invite', () => invitations.create(input, token!), t`Invitation sent to ${input.email_address}.`)) setInviteEmail(''); // kept if it failed
  }

  if (!token) return <ListPageSkeleton label={t`Loading organization settings…`} sections={2} />;
  if (loadError && !data) return <main className="mx-auto max-w-6xl px-6 py-10"><Link href="/settings" className="text-sm text-muted-foreground hover:underline">← <Trans>Settings</Trans></Link><h1 className="mt-2 mb-6 text-3xl font-bold tracking-tight"><Trans>Organization</Trans></h1><OutcomeNote outcome={outcome} section="received" /><ReceivedInvitations items={receivedInvites} token={token} run={run} /><p role="alert" className="mt-6 text-sm text-muted-foreground">{loadError}</p></main>;
  if (!data) return <ListPageSkeleton label={t`Loading members and teams…`} sections={2} />;

  const administrators = new Set(data.admins.map((admin) => admin.user_id));
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/settings" className="text-sm text-muted-foreground hover:underline">← <Trans>Settings</Trans></Link>
      <header className="mt-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight"><Trans>Organization</Trans></h1>
        <p className="mt-1 text-sm text-muted-foreground"><Trans>View organization members, teams, and who can manage them.</Trans></p>
      </header>
      <OutcomeNote outcome={outcome} section="received" />
      <ReceivedInvitations items={receivedInvites} token={token} run={run} />

      <section className={card}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold"><Trans>Members</Trans></h2><p className="text-sm text-muted-foreground">{memberCount(i18n, data.members.length, (sentInvites ?? []).filter((i) => i.status === 'pending' && new Date(i.expires_at) > new Date()).length, memberLimit)}</p></div>
          {data.isAdmin && <Badge><Trans>Organization admin</Trans></Badge>}
        </div>
        <OutcomeNote outcome={outcome} section="members" />
        {data.members.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>No members found.</Trans></p> : (
          <ul className="divide-y">
            {data.members.map((member) => {
              const teams = data.teams.filter(({ members }) => members.some((item) => item.user_id === member.user_id));
              const leaderOf = teams.filter(({ members }) => members.some((item) => item.user_id === member.user_id && item.leader));
              return <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="font-medium">{memberName(member)}</p><p className="text-xs text-muted-foreground">{member.identifier}</p></div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {administrators.has(member.user_id) && <Badge variant="secondary"><Trans>Admin</Trans></Badge>}
                  {leaderOf.map(({ team }) => <Badge key={team.id} variant="outline"><Trans>{team.name} leader</Trans></Badge>)}
                  {teams.filter(({ members }) => !members.some((item) => item.user_id === member.user_id && item.leader)).map(({ team }) => <Badge key={team.id} variant="outline">{team.name}</Badge>)}
                  {data.isAdmin && <Button size="xs" variant="ghost" disabled={busy.includes(`admin:${member.user_id}`)} onClick={() => void run(`admin:${member.user_id}`, () => administrators.has(member.user_id) ? organization.revokeAdmin(member.user_id, token) : organization.grantAdmin(member.user_id, token), administrators.has(member.user_id) ? t`Organization admin removed.` : t`Organization admin assigned.`)}>{administrators.has(member.user_id) ? <Trans>Remove admin</Trans> : <Trans>Make admin</Trans>}</Button>}
                </div>
              </li>;
            })}
          </ul>
        )}
      </section>

      <section className={`${card} mt-6`}>
        <div className="mb-4"><h2 className="text-lg font-semibold"><Trans>Teams</Trans></h2><p className="text-sm text-muted-foreground"><Trans>Teams connect members to project boards.</Trans></p></div>
        <OutcomeNote outcome={outcome} section="teams" />
        {data.teams.length === 0 && <p className="mb-4 text-sm text-muted-foreground"><Trans>No teams yet.</Trans></p>}
        <div className="space-y-4">
          {data.teams.map(({ team, members }) => <article key={team.id} className="rounded-lg border p-4">
            <TeamEditor team={team} members={members} people={data.members} projects={data.projects} projectTeams={data.projectTeams} isAdmin={data.isAdmin} token={token} busy={busy} person={person}
              onChange={(key, action, success) => run(`${team.id}:${key}`, action, success)} />
          </article>)}
        </div>
        {data.isAdmin && <form onSubmit={createTeam} className="mt-5 grid gap-2 border-t pt-5 sm:grid-cols-[1fr_2fr_auto]">
          <Input aria-label={t`New team name`} value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} required maxLength={100} placeholder={t`Team name`} />
          <Input aria-label={t`Team description`} value={newTeamDescription} onChange={(event) => setNewTeamDescription(event.target.value)} maxLength={500} placeholder={t`Description (optional)`} />
          <Button type="submit" disabled={busy === 'create-team'}>{busy === 'create-team' ? <Trans>Creating…</Trans> : <Trans>Create team</Trans>}</Button>
        </form>}
      </section>

      {data.isAdmin && <section className={`${card} mt-6`}>
        <div className="mb-4"><h2 className="text-lg font-semibold"><Trans>Invite people</Trans></h2><p className="text-sm text-muted-foreground"><Trans>Invitations are sent by email and expire after seven days.</Trans></p></div>
        <form onSubmit={sendInvite} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <Input type="email" aria-label={t`Email address`} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required placeholder="name@example.com" />
          <Select value={inviteScope} onValueChange={(value) => { if (value) { setInviteScope(value as Invitation['scope']); setInviteTarget(''); } }}>
            <SelectTrigger aria-label={t`Invitation scope`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="organization"><Trans>Organization</Trans></SelectItem><SelectItem value="team"><Trans>Team</Trans></SelectItem><SelectItem value="project"><Trans>Project</Trans></SelectItem></SelectContent>
          </Select>
          {inviteScope !== 'organization' ? <Select value={inviteTarget || NO_TARGET} onValueChange={(value) => setInviteTarget(value === NO_TARGET || !value ? '' : value)}>
            <SelectTrigger aria-label={t`Invitation target`} className="w-full"><SelectValue placeholder={inviteScope === 'team' ? t`Choose team` : t`Choose project`} /></SelectTrigger>
            <SelectContent><SelectItem value={NO_TARGET}>{inviteScope === 'team' ? <Trans>Choose team</Trans> : <Trans>Choose project</Trans>}</SelectItem>
              {(inviteScope === 'team' ? data.teams.map(({ team }) => team) : data.projects).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select> : <span />}
          <Button type="submit" disabled={busy === 'invite' || !inviteReady(inviteScope, inviteTarget)}>{busy === 'invite' ? <Trans>Sending…</Trans> : <Trans>Send invite</Trans>}</Button>
        </form>
        <div className="mt-3"><OutcomeNote outcome={outcome} section="invites" /></div>
        <div className="mt-5 border-t pt-4">
          <h3 className="mb-2 font-medium"><Trans>Invitations</Trans></h3>
          {sentInvites === null ? <Skeleton role="status" aria-label={t`Loading invitations…`} className="h-12 w-full" /> : sentInvites.length === 0 ? <p className="text-sm text-muted-foreground"><Trans>No invitations yet.</Trans></p> : <ul className="divide-y">
            {sentInvites.map((invite) => <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div><p className="font-medium">{invite.email_address}</p><p className="text-muted-foreground">{invite.scope}{invite.target_id ? ` · ${targetName(i18n, data.teams.map(({ team }) => team), data.projects, invite)}` : ''} · <Trans>expires {dates(i18n, { day: 'numeric', month: 'numeric', year: 'numeric' }).format(new Date(invite.expires_at))}</Trans></p></div>
              <div className="flex items-center gap-2"><Badge variant={invite.status === 'pending' ? 'secondary' : 'outline'}>{invite.status}</Badge>
                {invite.status === 'pending' && <Button size="sm" variant="outline" disabled={busy === `revoke:${invite.id}`} onClick={() => void run(`revoke:${invite.id}`, () => invitations.revoke(invite.id, token), t`Invitation revoked.`)}><Trans>Revoke</Trans></Button>}
                {invite.accept_url && <a className="text-xs underline" href={invite.accept_url} target="_blank" rel="noreferrer"><Trans>Open invite</Trans></a>}
              </div>
            </li>)}
          </ul>}
        </div>
      </section>}

      {data.isAdmin && <section className={`${card} mt-6`}>
        <h2 className="text-lg font-semibold"><Trans>Organization admins</Trans></h2><p className="mb-3 text-sm text-muted-foreground"><Trans>The organization creator starts as its first admin.</Trans></p>
        <ul className="divide-y">{data.admins.map((admin) => <li key={admin.user_id} className="py-2 text-sm">{person(admin.user_id)} <span className="text-muted-foreground">· {adminSource(i18n, admin.granted_by, person)}</span></li>)}</ul>
      </section>}
    </main>
  );
}

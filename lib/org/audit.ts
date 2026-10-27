import type { I18n, MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { Assignee, AuditEvent, AuditFilters } from '@/lib/api';
import { personLabel } from '@/lib/work/people';
import { ERROR_MESSAGES } from '@/lib/api/error-codes';

// ORG_ACTIONS is every action the backend's org audit log holds (its OpenAPI, /org/audit): each has a
// sentence below, and a test fails on one without.
export const ORG_ACTIONS = [
  'member.invited', 'member.invitation_revoked', 'member.joined', 'member.removed', 'admin.granted', 'admin.revoked',
  'api_key.created', 'api_key.revoked',
  'project.created', 'project.renamed', 'project.deleted',
  'board.created', 'board.renamed', 'board.archived', 'board.restored', 'board.deleted',
  'team.created', 'team.deleted', 'team.members_changed', 'sprint.started', 'sprint.closed',
  'integration.connected', 'integration.disconnected', 'calendar.domain_changed',
  'webhook.created', 'webhook.updated', 'webhook.deleted',
  'import.run', 'export.downloaded', 'tickets.bulk_edited',
  'org.plan_changed', 'org.deleted', 'ticket.deleted', 'ticket.restored', 'ticket.purged',
  // TL-700 (for TL-624): refused attempts, settings with before and after, embedding, repositories, expiry
  'access.refused', 'board.settings_changed', 'project.request_form', 'embed.site_added', 'embed.site_removed',
  'embed.key_created', 'embed.key_deleted', 'repo.linked', 'repo.unlinked', 'integration.updated',
  'roadmap.visibility_changed', 'api_key.expired',
] as const;

// ACTION_FILTERS: the action filter's choices. The backend takes one action, or one prefix ending in a dot.
export const ACTION_FILTERS: { value: string; label: MessageDescriptor }[] = [
  { value: 'access.refused', label: msg`Refused attempts` },
  { value: 'member.', label: msg`Members and invitations` },
  { value: 'admin.', label: msg`Admins` },
  { value: 'api_key.', label: msg`API keys` },
  { value: 'project.', label: msg`Projects` },
  { value: 'board.', label: msg`Boards` },
  { value: 'team.', label: msg`Teams` },
  { value: 'sprint.', label: msg`Sprints` },
  { value: 'integration.', label: msg`Integrations` },
  { value: 'repo.', label: msg`Repositories` },
  { value: 'embed.', label: msg`Embedding` },
  { value: 'roadmap.', label: msg`Roadmaps` },
  { value: 'webhook.', label: msg`Webhooks` },
  { value: 'import.', label: msg`Imports` },
  { value: 'export.', label: msg`Exports` },
  { value: 'tickets.bulk_edited', label: msg`Bulk edits` },
  { value: 'ticket.deleted', label: msg`Deleted tickets` },
  { value: 'org.', label: msg`Organization and plan` },
];

const PROVIDERS: Record<string, string> = {
  bugfixes: 'Bugfixes', github: 'GitHub', bitbucket: 'Bitbucket', 'google-calendar': 'Google Calendar',
  'google-chat': 'Google Chat', jira: 'Jira', linear: 'Linear',
};
const PLANS: Record<string, string> = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' };

// SETTINGS: a board's settings, as board.settings_changed names them
const SETTINGS: Record<string, MessageDescriptor> = {
  estimate_scale: msg`estimates`, style: msg`style`, agent_review: msg`agent review`, dev_complete_column_id: msg`finish on release`,
  review_column_id: msg`review column`, when_sprint_ends: msg`when a sprint ends`, team_id: msg`team`,
};
// SEEN_BY: who can see a roadmap
const SEEN_BY: Record<string, MessageDescriptor> = { public: msg`anyone`, login_only: msg`anyone signed in`, team: msg`the team` };

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

// whoDid: who an entry is by: a person's or agent's name, or TrackLin.es for the system.
export const whoDid = (i18n: I18n, e: AuditEvent, people: Assignee[] | null) => (e.actor ? personLabel(i18n, e.actor, people) : 'TrackLin.es');

// auditSentence: what an entry says happened, in the reader's language. Unknown actions (a newer backend)
// still read as a change, with their name.
export function auditSentence(i18n: I18n, e: AuditEvent, people: Assignee[] | null): string {
  const d = e.data ?? {};
  const name = str(d.name);
  const from = str(d.from);
  const to = str(d.to);
  const user = personLabel(i18n, e.action.startsWith('team.') ? str(d.user) : e.target_id, people);
  const t = (m: MessageDescriptor) => i18n._(m);
  switch (e.action) {
    case 'member.invited':
      return d.scope === 'team' ? t(msg`Invited someone to a team`) : d.scope === 'project' ? t(msg`Invited someone to a project`) : t(msg`Invited someone to the organization`);
    case 'member.invitation_revoked': return t(msg`Withdrew an invitation`);
    case 'member.joined': return t(msg`${user} joined the organization`);
    case 'member.removed': return t(msg`${user} left the organization`);
    case 'admin.granted': return t(msg`Made ${user} an admin`);
    case 'admin.revoked': return t(msg`Removed ${user} as an admin`);
    case 'api_key.created':
    case 'api_key.revoked': {
      const kind = d.kind === 'service' ? t(msg`service key`) : d.kind === 'ai' ? t(msg`agent key`) : t(msg`personal key`);
      const sentence = e.action === 'api_key.created' ? t(msg`Created the ${kind} “${name}”`) : t(msg`Revoked the ${kind} “${name}”`);
      return d.read_only === true ? `${sentence} (${t(msg`read-only`)})` : sentence;
    }
    case 'project.created': return t(msg`Created the project ${name}`);
    case 'project.renamed': return t(msg`Renamed the project ${from} to ${to}`);
    case 'project.deleted': return t(msg`Deleted the project ${name}`);
    case 'board.created': return t(msg`Created the board ${name}`);
    case 'board.renamed': return t(msg`Renamed the board ${from} to ${to}`);
    case 'board.archived': return t(msg`Archived the board ${name}`);
    case 'board.restored': return t(msg`Restored the board ${name}`);
    case 'board.deleted': return t(msg`Deleted the board ${name}`);
    case 'team.created': return t(msg`Created the team ${name}`);
    case 'team.deleted': return t(msg`Deleted the team ${name}`);
    case 'team.members_changed':
      switch (d.change) {
        case 'added': return t(msg`Added ${user} to ${name}`);
        case 'removed': return t(msg`Removed ${user} from ${name}`);
        case 'made_leader': return t(msg`Made ${user} a leader of ${name}`);
        default: return t(msg`${user} no longer leads ${name}`);
      }
    case 'sprint.started': { const n = str(d.number); const board = str(d.board_name); return t(msg`Started sprint ${n} on ${board}`); }
    case 'sprint.closed': { const n = str(d.number); const board = str(d.board_name); return t(msg`Closed sprint ${n} on ${board}`); }
    case 'integration.connected':
    case 'integration.disconnected': {
      const provider = PROVIDERS[str(d.provider)] ?? str(d.provider);
      const account = str(d.account || d.site || d.workspace || d.domain);
      const sentence = e.action === 'integration.connected' ? t(msg`Connected ${provider}`) : t(msg`Disconnected ${provider}`);
      return account ? `${sentence} (${account})` : sentence;
    }
    case 'calendar.domain_changed': return t(msg`Changed the Google Calendar domain from ${from} to ${to}`);
    case 'webhook.created': { const host = str(d.host); return t(msg`Added a webhook to ${host}`); }
    case 'webhook.updated': { const host = str(d.host); return t(msg`Changed the webhook to ${host}`); }
    case 'webhook.deleted': { const host = str(d.host); return t(msg`Removed the webhook to ${host}`); }
    case 'import.run': {
      const source = str(d.source); const created = str(d.created);
      return d.state === 'done' ? t(msg`Imported ${created} tickets from ${source}`)
        : d.state === 'cancelled' ? t(msg`Cancelled an import from ${source}`) : t(msg`An import from ${source} failed`);
    }
    case 'export.downloaded': return d.kind === 'audit_csv' ? t(msg`Exported the audit log`) : t(msg`Exported a project’s tickets as CSV`);
    case 'tickets.bulk_edited': { const changed = str(d.changed); const count = str(d.count); return t(msg`Bulk-edited ${changed} of ${count} tickets`); }
    case 'org.plan_changed': { const plan = PLANS[str(d.plan)] ?? str(d.plan); return t(msg`Changed the plan to ${plan}`); }
    case 'org.deleted': return t(msg`Deleted the organization`);
    case 'ticket.deleted': return t(msg`Deleted a ticket`);
    case 'ticket.restored': return t(msg`Restored a ticket`);
    case 'ticket.purged': return t(msg`Removed a deleted ticket for good`);
    case 'access.refused': {
      // what they tried, and why it was refused, in the reader's language where the app knows the reason
      const route = str(d.route) || `${str(d.method)} ${str(d.path)}`;
      const code = str(d.code);
      const why = code ? (ERROR_MESSAGES[code] ? i18n._(ERROR_MESSAGES[code]) : code) : '';
      return why ? t(msg`Wasn’t allowed: ${route} (${why})`) : t(msg`Wasn’t allowed: ${route}`);
    }
    case 'board.settings_changed': {
      const fields = Object.keys((d.fields as Record<string, unknown>) ?? {}).map((f) => (SETTINGS[f] ? t(SETTINGS[f]) : f)).join(', ');
      return t(msg`Changed ${name}’s settings: ${fields}`);
    }
    case 'project.request_form':
      return d.change === 'opened' ? t(msg`Opened the request form of ${name}`)
        : d.change === 'closed' ? t(msg`Closed the request form of ${name}`) : t(msg`Made a new request form link for ${name}`);
    case 'embed.site_added': { const origin = str(d.origin); return t(msg`Allowed ${origin} to embed`); }
    case 'embed.site_removed': { const origin = str(d.origin); return t(msg`Stopped ${origin} embedding`); }
    case 'embed.key_created': { const label = str(d.label); return t(msg`Created the embed key “${label}”`); }
    case 'embed.key_deleted': { const label = str(d.label); return t(msg`Deleted the embed key “${label}”`); }
    case 'repo.linked': { const repo = str(d.repo); return t(msg`Linked the repository ${repo}`); }
    case 'repo.unlinked': { const repo = str(d.repo); return t(msg`Unlinked the repository ${repo}`); }
    case 'integration.updated': { const provider = PROVIDERS[str(d.provider)] ?? str(d.provider); return t(msg`Changed the ${provider} settings`); }
    case 'roadmap.visibility_changed': {
      const title = str(d.title);
      const seenBy = SEEN_BY[str(d.to)] ? t(SEEN_BY[str(d.to)]) : str(d.to);
      return t(msg`Made the roadmap ${title} visible to ${seenBy}`);
    }
    case 'api_key.expired': {
      const kind = d.kind === 'service' ? t(msg`service key`) : d.kind === 'ai' ? t(msg`agent key`) : t(msg`personal key`);
      return t(msg`The ${kind} “${name}” expired`);
    }
  }
  const action = e.action;
  return t(msg`Made a change (${action})`);
}

// auditLink: where an entry's target can be opened, while it exists: projects still in the org, boards and
// restored tickets. Deleted things have nowhere to go.
export function auditLink(e: AuditEvent, projectIds: Set<string>): string | null {
  if (!e.target_id || /\.(deleted|purged)$/.test(e.action)) return null;
  switch (e.target_type) {
    case 'project': return projectIds.has(e.target_id) ? `/projects/${e.target_id}` : null;
    case 'board': return `/boards/${e.target_id}`;
    case 'ticket': return `/tickets/${e.target_id}`;
  }
  return null;
}

// URL_FILTERS: the filters kept in the page's URL, so a filtered log can be shared and reloaded. from and
// to are days (YYYY-MM-DD), both included.
export const URL_FILTERS = ['actor', 'action', 'project', 'from', 'to'] as const;

// filtersOf: the page's URL as the API's filters: days become the start of that day, and the day after to, in local time.
export function filtersOf(params: URLSearchParams): AuditFilters {
  const day = (v: string | null, after = false) => {
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
    const d = new Date(`${v}T00:00:00`);
    if (after) d.setDate(d.getDate() + 1);
    return d.toISOString();
  };
  return {
    actor: params.get('actor') || undefined, action: params.get('action') || undefined, project: params.get('project') || undefined,
    from: day(params.get('from')), to: day(params.get('to'), true),
  };
}

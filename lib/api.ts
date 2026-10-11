// Typed client for the Go backend. Shapes mirror backend/internal/*/postgres.go JSON tags.
// Browser calls go through the same-origin /api proxy (app/api/[...path]); server components
// call the backend directly via BACKEND_URL. Pass a Clerk session token as `token`
// (client: useAuth().getToken(), server: (await auth()).getToken()).
import type { EstimateScale } from './estimates';

export type Visibility = 'public' | 'login_only' | 'team';

export type TicketType = 'bug' | 'feature' | 'task';
export type Ticket = {
  id: string; key?: string; column_id: string; title: string; description: string; position: number;
  project_id?: string; labels?: string[];
  type?: TicketType; sprint_id?: string | null;
  created_by: string; assigned_to?: string | null; priority?: string;
  blocked?: boolean; // waits on tickets that aren't done yet
  estimate?: string | null; // on the board's estimate scale
  created_at?: string; updated_at?: string; // UTC ISO; show with <When>
  done_at?: string | null; resolved_at?: string | null; // set once it reached Done / was resolved
  started_at?: string | null; // first move out of the board's first column; null for historical tickets
  planned_sprint_id?: string | null; // a backlog ticket planned into a board's upcoming sprint (refinement)
  external_source?: string | null; external_url?: string | null; // made by an integration, e.g. a Bugfixes report
  resolution?: 'done' | 'wont_do' | null; // how a resolved backlog ticket was closed (null = done)
  review_requested_at?: string | null; // an agent finished it on a review board: waiting for a person
};
// A project ticket not on any board or sprint yet.
export type BacklogTicket = Omit<Ticket, 'column_id'> & { column_id: null; project_id: string; type: TicketType };
export type BacklogPage = { tickets: BacklogTicket[]; counts: Record<TicketType | 'all', number>; labels: ProjectLabel[] };
// A board's time box; the board shows only the open sprint's tickets.
export type Sprint = {
  id: string; board_id: string; number: number; length_days: number;
  starts_at: string; ends_at: string; closed_at: string | null;
  goal?: string; // one line the sprint is for; "" = none
};
export type Column = { id: string; name: string; position: number; tickets: Ticket[]; wip_limit?: number | null };
export type BoardStyle = 'sprints' | 'kanban';
export type Board = {
  id: string; project_id: string; owner_clerk_id: string; name: string; description: string;
  team_id?: string | null;
  created_at: string; updated_at: string; columns?: Column[];
  style?: BoardStyle;
  hidden_done?: number; // kanban: Done tickets finished over 14 days ago, left off the board
  estimate_scale?: EstimateScale;
  agent_review?: boolean; // agents' moves into Done wait for a person's review
  sprint?: Sprint; // open sprint, absent when the board doesn't run sprints
  stats?: BoardStats; // a project's boards only
};
// counts the tickets the board shows (open sprint's, or all); in_progress = past the first column, not done
export type BoardStats = { open: number; in_progress: number; done: number; urgent: number; active: string; sprint_number: number | null; sprint_ends_at: string | null };
export type BoardFlow = {
  weeks: number;
  tickets: { id: string; key: string; title: string; started_at: string | null; done_at: string; cycle_days: number | null }[];
  median_cycle_days: number | null;
  p85_cycle_days: number | null;
  throughput: { week_start: string; tickets: number }[];
};
export type RoadmapItem = {
  id: string; title: string; description: string; target_date: string | null; position: number;
  start_date?: string | null; // Gantt bar start (YYYY-MM-DD)
  manual_status?: 'not_started' | 'in_progress' | 'done';
  status?: 'not_started' | 'in_progress' | 'done'; // derived when tickets are linked
  progress?: { done: number; total: number }; // linked tickets done / total (everyone)
  tickets?: { id: string; title: string; done: boolean }[]; // linked tickets (owner only)
};
export type TicketComment = {
  id: string; ticket_id: string; parent_comment_id: string | null;
  body: string; author: string; created_at: string;
};
export type Roadmap = {
  id: string; project_id: string; title: string; description: string; visibility: Visibility;
  created_at: string; updated_at: string; progress?: { done: number; total: number }; items?: RoadmapItem[];
};
// A project holds a board per team plus its roadmaps; boards/roadmaps are only filled by projects.get.
export type Project = {
  id: string; name: string; description: string; key_prefix?: string; created_at: string; updated_at: string;
  boards?: Board[]; roadmaps?: Roadmap[];
  stats?: ProjectStats; // list only
};
// open/done: board tickets (done = last column); urgent: open urgent tickets anywhere; active: latest change
export type ProjectStats = { boards: number; roadmaps: number; open: number; done: number; backlog: number; urgent: number; active: string };
export type ProjectLabel = { label: string; count: number };
export type ApiKeyKind = 'ai' | 'service';
export type ApiKey = { id: string; name: string; kind: ApiKeyKind; prefix: string; created_at: string; last_used_at: string | null };
export type Subscription = { paid: boolean; project_limit: number; billed?: boolean }; // project_limit -1 = unlimited; billed = through Stripe, so there's billing to manage

export type OrganizationMember = { user_id: string; first_name?: string; last_name?: string; image_url?: string; identifier: string };
export type OrganizationMemberPage = { members: OrganizationMember[]; total_count: number; limit: number; offset: number };
export type TeamMember = { user_id: string; leader: boolean };
export type OrgAdmin = { user_id: string; granted_by: string; created_at: string };
export type OrganizationRole = { user_id: string; org_id: string; admin: boolean; leads: string[] };
export type Invitation = {
  id: string; org_id: string; email_address: string; scope: 'organization' | 'team' | 'project';
  target_id?: string; invited_by: string; accept_url?: string; status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string; accepted_by?: string; accepted_at?: string; created_at: string;
};

export type LiveParticipant = { id: string; label: string };
export type LiveStandup = {
  people: LiveParticipant[]; index: number; spentMs: number; runningSince: number | null; startedBy: string;
};
export type BoardLiveEvent = { id: number; type: 'standup' | 'standup-ended' | 'refinement' | string; payload?: unknown };

export const organization = {
  members: (token: T, offset = 0) => api<OrganizationMemberPage>(`/organizations/members?limit=500&offset=${offset}`, { token }),
  me: (token: T) => api<OrganizationRole>('/organizations/me', { token }),
  admins: (token: T) => api<OrgAdmin[]>('/organizations/admins', { token }),
  grantAdmin: (userId: string, token: T) => api<void>(`/organizations/admins/${encodeURIComponent(userId)}`, { method: 'PUT', token }),
  revokeAdmin: (userId: string, token: T) => api<void>(`/organizations/admins/${encodeURIComponent(userId)}`, { method: 'DELETE', token }),
};

export const teams = {
  list: (token: T) => api<Team[]>('/teams', { token }),
  create: (name: string, description: string, token: T) => api<Team>('/teams', { method: 'POST', body: { name, description }, token }),
  update: (id: string, name: string, description: string, token: T) => api<void>(`/teams/${id}`, { method: 'PATCH', body: { name, description }, token }),
  remove: (id: string, token: T) => api<void>(`/teams/${id}`, { method: 'DELETE', token }),
  members: (id: string, token: T) => api<TeamMember[]>(`/teams/${id}/members`, { token }),
  addMember: (id: string, userId: string, token: T) => api<void>(`/teams/${id}/members/${encodeURIComponent(userId)}`, { method: 'PUT', token }),
  removeMember: (id: string, userId: string, token: T) => api<void>(`/teams/${id}/members/${encodeURIComponent(userId)}`, { method: 'DELETE', token }),
  addLeader: (id: string, userId: string, token: T) => api<void>(`/teams/${id}/leaders/${encodeURIComponent(userId)}`, { method: 'PUT', token }),
  removeLeader: (id: string, userId: string, token: T) => api<void>(`/teams/${id}/leaders/${encodeURIComponent(userId)}`, { method: 'DELETE', token }),
  projectTeams: (projectId: string, token: T) => api<Team[]>(`/projects/${projectId}/teams`, { token }),
  addProject: (projectId: string, teamId: string, token: T) => api<void>(`/projects/${projectId}/teams/${teamId}`, { method: 'PUT', token }),
  removeProject: (projectId: string, teamId: string, token: T) => api<void>(`/projects/${projectId}/teams/${teamId}`, { method: 'DELETE', token }),
};

export const invitations = {
  mine: (token: T) => api<Invitation[]>('/invitations', { token }),
  list: (token: T) => api<Invitation[]>('/organizations/invitations', { token }),
  create: (input: { email_address: string; scope: Invitation['scope']; target_id?: string }, token: T) =>
    api<Invitation>('/organizations/invitations', { method: 'POST', body: input, token }),
  revoke: (id: string, token: T) => api<void>(`/organizations/invitations/${id}`, { method: 'DELETE', token }),
  accept: (id: string, token: T) => api<void>(`/organizations/invitations/${id}/accept`, { method: 'POST', token }),
};

export type Team = { id: string; org_id: string; name: string; description: string; created_at: string; updated_at: string };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function base(): string {
  if (typeof window === 'undefined') return `${process.env.BACKEND_URL ?? 'http://localhost:8080'}/api`;
  return process.env.NEXT_PUBLIC_API_URL ?? '/api';
}

type Options = { method?: string; body?: unknown; token?: string | null };

async function reportBackendFailure(message: string, detail: string): Promise<void> {
  // Never expose BugFixes credentials to the browser. Browser-side failures
  // continue to surface as ApiError for the UI to handle.
  if (typeof window !== 'undefined') return;

  try {
    const { error: logError } = await import('bugfixes');
    logError(message, detail);
  } catch {
    // Reporting must not replace the original API failure.
  }
}

// In the browser, ask Clerk for the token at request time: the `token` callers hold can be minutes
// old (a form left open, a background tab), and Clerk tokens only live ~60s. Clerk refreshes as needed.
type ClerkSession = { getToken(o?: { skipCache?: boolean }): Promise<string | null> };
async function liveToken(passed: string | null | undefined, skipCache = false): Promise<string | null | undefined> {
  if (typeof window === 'undefined' || !passed) return passed; // server side, or a signed-out call
  const session = (window as { Clerk?: { session?: ClerkSession | null } }).Clerk?.session;
  return (await session?.getToken({ skipCache }).catch(() => null)) ?? passed;
}

export async function api<T>(path: string, { method = 'GET', body, token }: Options = {}): Promise<T> {
  const send = async (skipCache: boolean) => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    // day-based rules (a sprint's last day) follow the user's local time; data stays UTC.
    // Browser only: on the server this would be the server's zone, so the backend uses UTC.
    if (typeof window !== 'undefined') headers['Tracklines-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const t = await liveToken(token, skipCache);
    if (t) headers.Authorization = `Bearer ${t}`;
    return fetch(base() + path, {
      method, headers, cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };
  let res: Response;
  try {
    res = await send(false);
    // a token that expired in flight (or clock skew): force a fresh one and retry once
    if (res.status === 401 && token && typeof window !== 'undefined') res = await send(true);
  } catch (cause) {
    await reportBackendFailure('backend request failed', `${method} ${path}: ${cause instanceof Error ? cause.message : String(cause)}`);
    throw cause;
  }
  if (!res.ok) {
    const message = (await res.text()).trim() || res.statusText;
    if (res.status >= 500) {
      await reportBackendFailure('backend returned a server error', `${method} ${path} (${res.status})`);
    }
    throw new ApiError(res.status, message);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// Fetch based SSE keeps the same Bearer auth and token refresh behavior as JSON API calls.
export async function streamBoardLive(
  boardId: string, token: T, signal: AbortSignal,
  onEvent: (event: BoardLiveEvent) => void, onOpen?: () => void,
): Promise<void> {
  const request = async (skipCache: boolean) => {
    const t = await liveToken(token, skipCache);
    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    if (t) headers.Authorization = `Bearer ${t}`;
    return fetch(`${base()}/boards/${encodeURIComponent(boardId)}/live`, { headers, cache: 'no-store', signal });
  };
  let response = await request(false);
  if (response.status === 401 && token && typeof window !== 'undefined') response = await request(true);
  if (!response.ok) throw new ApiError(response.status, (await response.text()).trim() || response.statusText);
  if (!response.body) throw new Error('Live stream has no response body');
  onOpen?.();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary).replace(/\r/g, '');
        buffer = buffer.slice(boundary + 2);
        let eventName = '';
        const data: string[] = [];
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
        }
        if (data.length) {
          try {
            const parsed = JSON.parse(data.join('\n')) as BoardLiveEvent;
            onEvent({ ...parsed, type: parsed.type || eventName });
          } catch { /* Ignore malformed frames and keep the connection alive. */ }
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    reader.releaseLock();
  }
}

type T = string | null | undefined;

// One line per backend route (see backend/internal/service.go).
export const projects = {
  list: (token: T) => api<Project[]>('/projects', { token }),
  get: (id: string, token: T) => api<Project>(`/projects/${id}`, { token }),
  create: (p: { name: string; description?: string }, token: T) => api<Project>('/projects', { method: 'POST', body: p, token }),
  update: (id: string, p: { name: string; description: string; key_prefix?: string }, token: T) => api<void>(`/projects/${id}`, { method: 'PATCH', body: p, token }),
  remove: (id: string, token: T) => api<void>(`/projects/${id}`, { method: 'DELETE', token }),
  labels: (id: string, token: T) => api<ProjectLabel[]>(`/projects/${id}/labels`, { token }),
};

export const boards = {
  get: (id: string, token: T) => api<Board>(`/boards/${id}`, { token }),
  flow: (id: string, token: T, weeks = 12) => api<BoardFlow>(`/boards/${id}/flow?weeks=${weeks}`, { token }),
  create: (projectId: string, b: { name: string; description?: string; template_id?: string }, token: T) =>
    api<Board>(`/projects/${projectId}/boards`, { method: 'POST', body: b, token }),
  // Update the board name and/or settings; switching estimate_scale clears open tickets' estimates.
  update: (id: string, b: { name?: string; estimate_scale?: EstimateScale; style?: BoardStyle; agent_review?: boolean }, token: T) => api<void>(`/boards/${id}`, { method: 'PATCH', body: b, token }),
  remove: (id: string, token: T) => api<void>(`/boards/${id}`, { method: 'DELETE', token }),
};

export const liveViews = {
  standup: (boardId: string, token: T) => api<LiveStandup>(`/boards/${boardId}/live/standup`, { token }),
  startStandup: (boardId: string, people: LiveParticipant[], token: T) =>
    api<LiveStandup>(`/boards/${boardId}/live/standup`, { method: 'POST', body: { people }, token }),
  standupAction: (boardId: string, action: 'next' | 'previous' | 'jump' | 'pause' | 'resume' | 'end', token: T, index?: number) =>
    api<LiveStandup | void>(`/boards/${boardId}/live/standup/action`, { method: 'POST', body: { action, ...(index === undefined ? {} : { index }) }, token }),
};

// Board templates: built-ins (ids "builtin:…") plus the org's own; creating and deleting is for org admins.
export type BoardTemplate = {
  id: string; name: string; builtin: boolean; style: BoardStyle; estimate_scale: EstimateScale;
  columns: { name: string; wip_limit: number | null }[]; // board order; the last is Done
};
export const boardTemplates = {
  list: (token: T) => api<BoardTemplate[]>('/board-templates', { token }),
  saveBoard: (name: string, boardId: string, token: T) => api<BoardTemplate>('/board-templates', { method: 'POST', body: { name, from_board_id: boardId }, token }),
  remove: (id: string, token: T) => api<void>(`/board-templates/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
};

export const columns = {
  create: (boardId: string, name: string, token: T) => api<Omit<Column, 'tickets'>>(`/boards/${boardId}/columns`, { method: 'POST', body: { name }, token }),
  // update renames and/or sets the advisory work-in-progress limit (0 removes it)
  update: (id: string, c: { name?: string; wip_limit?: number }, token: T) => api<void>(`/columns/${id}`, { method: 'PATCH', body: c, token }),
  remove: (id: string, token: T) => api<void>(`/columns/${id}`, { method: 'DELETE', token }),
  reorder: (boardId: string, ids: string[], token: T) => api<void>(`/boards/${boardId}/columns/order`, { method: 'PUT', body: { column_ids: ids }, token }),
};

// A linked ticket under "blocked by" / "blocks".
export type Dep = { id: string; title: string; done: boolean };

// One ticket plus where it lives (board/column/sprint are null for backlog tickets) — /tickets/[id].
export type TicketDetail = Omit<Ticket, 'column_id'> & {
  column_id: string | null; project_id: string; project_name: string; type: TicketType;
  board_id: string | null; board_name: string | null; column_name: string | null; sprint_number: number | null;
  estimate_scale: EstimateScale; // the board's; 'none' in the backlog
  done: boolean; // in the board's last column: attachments locked
  blocked_by: Dep[]; blocks: Dep[];
  parent?: Dep | null; // this is a sub-ticket of parent
  children?: Dep[]; // its sub-tickets
};
export type TicketSearchResult = Ticket & {
  project_name: string; board_id: string | null; board_name: string | null; column_name: string | null;
  done: boolean; snippet: string;
};

export type Assignee = { id: string; label: string; kind?: 'person' | 'ai' | 'service' };

export const tickets = {
  get: (id: string, token: T) => api<TicketDetail>(`/tickets/${id}`, { token }),
  getByKey: (key: string, token: T) => api<TicketDetail>(`/ticket-keys/${encodeURIComponent(key)}`, { token }),
  // the Bugfixes panel for a ticket Bugfixes made (404 otherwise)
  bugfixes: (id: string, token: T) => api<TicketBugfixes>(`/tickets/${id}/bugfixes`, { token }),
  // also "My work": assignee 'me', status 'open', newest change first, paged
  search: (q: { text?: string; project?: string; board?: string; types?: TicketType[]; priorities?: string[]; assignee?: string;
    status?: 'open' | 'done'; limit?: number; page?: number }, token: T) => {
    const params = new URLSearchParams();
    if (q.text?.trim()) params.set('q', q.text.trim());
    if (q.project) params.set('project', q.project);
    if (q.board) params.set('board', q.board);
    for (const type of q.types ?? []) params.append('type', type);
    for (const p of q.priorities ?? []) params.append('priority', p);
    if (q.assignee) params.set('assignee', q.assignee);
    if (q.status) params.set('status', q.status);
    if (q.page && q.page > 1) params.set('page', String(q.page));
    params.set('limit', String(q.limit ?? 20));
    return api<TicketSearchResult[]>(`/search?${params}`, { token });
  },
  // review settles an agent's finished ticket: approve → Done, else back to the first column (comment added)
  review: (id: string, approve: boolean, comment: string, token: T) =>
    api<void>(`/tickets/${id}/review`, { method: 'POST', body: { approve, ...(comment.trim() && { comment: comment.trim() }) }, token }),
  // resolve closes a backlog ticket in place: done, or wont_do (decided against; the reason becomes a comment)
  resolve: (id: string, token: T, resolution: 'done' | 'wont_do' = 'done', reason = '') =>
    api<void>(`/tickets/${id}/resolve`, { method: 'POST', body: { resolution, ...(reason.trim() && { reason: reason.trim() }) }, token }),
  // assign hands a ticket to you (your user id) or an agent (API key name); null unassigns
  assign: (id: string, assignee: string | null, token: T) => api<Ticket>(`/tickets/${id}/assignee`, { method: 'PUT', body: { assignee }, token }),
  assignees: (token: T) => api<Assignee[]>('/assignees', { token }),
  // on the sprint's last day the ticket goes to the backlog instead: column_id null, redirected_to_backlog
  create: (columnId: string, t: { title: string; description?: string; type?: TicketType; priority?: string; labels?: string[]; estimate?: string }, token: T) =>
    api<Ticket & { redirected_to_backlog?: boolean }>(`/columns/${columnId}/tickets`, { method: 'POST', body: t, token }),
  update: (id: string, t: { title: string; description: string; type?: TicketType; priority?: string; estimate?: string }, token: T) => api<void>(`/tickets/${id}`, { method: 'PATCH', body: t, token }),
  setLabels: (id: string, labels: string[], token: T) => api<{ labels: string[] }>(`/tickets/${id}/labels`, { method: 'PUT', body: { labels }, token }),
  remove: (id: string, token: T) => api<void>(`/tickets/${id}`, { method: 'DELETE', token }),
  // dependencies: replace what ticket {id} waits on (same project, no loops); claim is refused while blocked
  // setParent makes id a sub-ticket of parentId (null detaches)
  setParent: (id: string, parentId: string | null, token: T) => api<void>(`/tickets/${id}/parent`, { method: 'PUT', body: { parent_id: parentId }, token }),
  setBlockedBy: (id: string, ticketIds: string[], token: T) => api<void>(`/tickets/${id}/blocked-by`, { method: 'PUT', body: { ticket_ids: ticketIds }, token }),
  // estimate sizes the ticket on the way in: required entering a board with an estimate scale
  move: (id: string, columnId: string, position: number, token: T, estimate?: string) =>
    api<void>(`/tickets/${id}/move`, { method: 'POST', body: { column_id: columnId, position, ...(estimate && { estimate }) }, token }),
};

export const ticketComments = {
  list: (ticketId: string, token: T) => api<TicketComment[]>(`/tickets/${ticketId}/comments`, { token }),
  create: (ticketId: string, body: string, token: T, parentCommentId?: string) =>
    api<TicketComment>(`/tickets/${ticketId}/comments`, {
      method: 'POST', body: { body, ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}) }, token,
    }),
};

export const roadmaps = {
  get: (id: string, token?: T) => api<Roadmap>(`/roadmaps/${id}`, { token }),
  // no public index: public roadmaps are reachable only by their /r/<id> link
  mine: (token: T) => api<Roadmap[]>('/roadmaps', { token }),
  create: (projectId: string, r: { title: string; description?: string; visibility?: Visibility }, token: T) =>
    api<Roadmap>(`/projects/${projectId}/roadmaps`, { method: 'POST', body: r, token }),
  update: (id: string, r: { title: string; description: string; visibility: Visibility }, token: T) =>
    api<void>(`/roadmaps/${id}`, { method: 'PUT', body: r, token }),
  remove: (id: string, token: T) => api<void>(`/roadmaps/${id}`, { method: 'DELETE', token }),
  // send each existing item's id so it's updated in place and keeps its linked tickets; unknown ids are created
  setItems: (id: string, items: (Pick<RoadmapItem, 'title' | 'description' | 'target_date' | 'start_date' | 'manual_status'> & { id?: string })[], token: T) =>
    api<void>(`/roadmaps/${id}/items`, { method: 'PUT', body: items, token }),
  setItemTickets: (id: string, itemId: string, ticketIds: string[], token: T) =>
    api<void>(`/roadmaps/${id}/items/${itemId}/tickets`, { method: 'PUT', body: { ticket_ids: ticketIds }, token }),
};

export const billing = {
  status: (token: T) => api<Subscription>('/subscription', { token }),
  checkout: (token: T) => api<{ url: string }>('/subscription/checkout', { method: 'POST', token }),
  portal: (token: T) => api<{ url: string }>('/subscription/portal', { method: 'POST', token }),
};

// API keys act as you; AI keys can be assigned tickets. Managing keys needs a signed-in session.
export const apiKeys = {
  list: (token: T) => api<ApiKey[]>('/keys', { token }),
  create: (name: string, kind: ApiKeyKind, token: T) => api<ApiKey & { key: string }>('/keys', { method: 'POST', body: { name, kind }, token }),
  revoke: (id: string, token: T) => api<void>(`/keys/${id}`, { method: 'DELETE', token }),
};

// Sprints are per board. Closing carries over every ticket not in the board's last column and
// creates the next sprint with the chosen length and optional future start date.
// Refinement: a board plans up to 2 sprints after its current one; backlog tickets are planned into
// them and sized. Capacity is velocity (last 3 closed sprints) + 10%; over it needs approval to start.
export type Capacity = {
  unit: 'points' | 'tickets'; velocity: number | null; cap: number | null; used: number; unestimated: number;
  over: boolean; approved_total: number | null; approved_by: string | null; approved_at: string | null; needs_approval: boolean;
};
export type PlannedSprint = { id: string; board_id: string; position: number; number: number; length_days: number; goal?: string; tickets: Ticket[]; capacity: Capacity };

export const plannedSprints = {
  list: (boardId: string, token: T) => api<PlannedSprint[]>(`/boards/${boardId}/planned-sprints`, { token }),
  plan: (boardId: string, lengthDays: number, token: T, goal?: string) =>
    api<PlannedSprint[]>(`/boards/${boardId}/planned-sprints`, { method: 'POST', body: { length_days: lengthDays, ...(goal && { goal }) }, token }),
  // length and/or goal ("" clears); the goal carries into the sprint when it starts
  update: (id: string, change: { length_days?: number; goal?: string }, token: T) =>
    api<PlannedSprint[]>(`/planned-sprints/${id}`, { method: 'PATCH', body: change, token }),
  remove: (id: string, token: T) => api<void>(`/planned-sprints/${id}`, { method: 'DELETE', token }),
  approve: (id: string, token: T) => api<PlannedSprint>(`/planned-sprints/${id}/approve`, { method: 'POST', token }),
  // plannedId null takes the ticket out; estimate on the planned board's scale
  planTicket: (ticketId: string, plannedId: string | null, token: T, estimate?: string) =>
    api<void>(`/tickets/${ticketId}/planned-sprint`, { method: 'PUT', body: { planned_sprint_id: plannedId, ...(estimate !== undefined && { estimate }) }, token }),
};

export const sprints = {
  list: (boardId: string, token: T) => api<Sprint[]>(`/boards/${boardId}/sprints`, { token }),
  start: (boardId: string, lengthDays: number, token: T, goal?: string) =>
    api<Sprint>(`/boards/${boardId}/sprints`, { method: 'POST', body: { length_days: lengthDays, ...(goal && { goal }) }, token }),
  setGoal: (id: string, goal: string, token: T) => api<Sprint>(`/sprints/${id}`, { method: 'PATCH', body: { goal }, token }), // "" clears
  updateLength: (id: string, lengthDays: number, token: T) =>
    api<Sprint>(`/sprints/${id}`, { method: 'PATCH', body: { length_days: lengthDays }, token }),
  close: (id: string, token: T, next: { next_length_days: number; next_starts_at?: string }) =>
    api<Sprint>(`/sprints/${id}/close`, { method: 'POST', body: next, token }),
  velocity: (boardId: string, token: T) => api<Velocity>(`/boards/${boardId}/velocity`, { token }),
  get: (id: string, token: T) => api<SprintDetail>(`/sprints/${id}`, { token }),
};

// Velocity: what each closed sprint finished, and the open sprint's burn data (see lib/burn.ts).
export type Velocity = {
  unit: 'points' | 'tickets';
  sprints: { number: number; starts_at: string; closed_at: string; completed: number }[]; // oldest first
  current: Burn | null;
};
// SprintDetail is one sprint, read-only. A closed sprint's tickets are what it finished; carried_over
// is how many moved to the next sprint (null when that wasn't recorded).
export type SprintDetail = Sprint & { unit: Velocity['unit']; burn: Burn; tickets: Ticket[]; carried_over: number | null };
export type Burn = {
  number: number; starts_at: string; ends_at: string;
  total: number; // today's scope
  unestimated: number; // on a points board
  done: { at: string; value: number }[]; // oldest first
};

// Backlog: project tickets not on any board. Pull one in with tickets.move(id, columnId, pos);
// it joins that board's open sprint.
export const backlog = {
  list: (projectId: string, token: T, type?: TicketType) =>
    api<BacklogTicket[]>(`/projects/${projectId}/backlog${type ? `?type=${type}` : ''}`, { token }),
  // one page, filtered and ordered (ready before blocked) by the server; counts drive the type tabs
  page: (projectId: string, q: { type?: TicketType; labels?: string[]; priorities?: string[]; page: number; perPage: number }, token: T) => {
    const params = new URLSearchParams({ page: String(q.page), per_page: String(q.perPage) });
    if (q.type) params.set('type', q.type);
    for (const l of q.labels ?? []) params.append('label', l);
    for (const priority of q.priorities ?? []) params.append('priority', priority);
    return api<BacklogPage>(`/projects/${projectId}/backlog/page?${params}`, { token });
  },
  create: (projectId: string, t: { title: string; description?: string; type: TicketType; priority?: string; labels?: string[] }, token: T) =>
    api<BacklogTicket>(`/projects/${projectId}/backlog`, { method: 'POST', body: t, token }),
  send: (ticketId: string, token: T) => api<void>(`/tickets/${ticketId}/backlog`, { method: 'POST', token }),
};

// Files attached to a ticket (stored on UploadThing; the backend keeps the records).
export type Attachment = {
  id: string; ticket_id: string; key: string; url: string; name: string; size: number;
  content_type: string; created_by: string; created_at: string;
};

export const attachments = {
  list: (ticketId: string, token: T) => api<Attachment[]>(`/tickets/${ticketId}/attachments`, { token }),
  add: (ticketId: string, f: { key: string; url: string; name: string; size: number; content_type: string }, token: T) =>
    api<Attachment>(`/tickets/${ticketId}/attachments`, { method: 'POST', body: f, token }),
  remove: (id: string, token: T) => api<void>(`/attachments/${id}`, { method: 'DELETE', token }),
};

// TicketBugfixes is a Bugfixes-made ticket's panel. available false: linked, but no live details
// (not_connected: the org hasn't connected Bugfixes; unavailable: Bugfixes couldn't be reached).
export type TicketBugfixes = {
  source: 'bugfixes'; project: string; report_id: string; url: string;
  available: boolean; reason?: 'not_connected' | 'unavailable'; regressed: boolean;
  report?: { title: string; occurrences: number; status: 'open' | 'resolved' | 'ignored'; last_seen: string; levels: string[]; file: string; line: number };
};

// Integrations: an org connects Bugfixes (an access token), GitHub (the app) and Bitbucket (OAuth).
export type IntegrationProvider = 'bugfixes' | 'github' | 'bitbucket';
export type IntegrationStatus = { provider: IntegrationProvider; connected: boolean; account?: string; base_url?: string; updated_by?: string; updated_at?: string };
export type GitRepo = { full_name: string; default_branch: string; private: boolean };
export type ProjectRepo = { provider: 'github' | 'bitbucket'; full_name: string; default_branch: string; created_at?: string };

export const integrations = {
  status: (provider: IntegrationProvider, token: T) => api<IntegrationStatus>(`/integrations/${provider}`, { token }),
  // Bugfixes: paste an access token
  connect: (provider: 'bugfixes', input: { token: string; base_url?: string }, token: T) =>
    api<void>(`/integrations/${provider}`, { method: 'PUT', body: input, token }),
  disconnect: (provider: IntegrationProvider, token: T) => api<void>(`/integrations/${provider}`, { method: 'DELETE', token }),
  // GitHub / Bitbucket: go to url, then the provider sends the admin back to /settings/integrations/<provider>
  connectURL: (provider: 'github' | 'bitbucket', token: T) => api<{ url: string }>(`/integrations/${provider}/connect`, { token }),
  complete: (provider: 'github' | 'bitbucket', input: { state: string; installation_id?: string; code?: string }, token: T) =>
    api<void>(`/integrations/${provider}/complete`, { method: 'POST', body: input, token }),
  repos: (provider: 'github' | 'bitbucket', token: T) => api<GitRepo[]>(`/integrations/${provider}/repos`, { token }),
};

export const projectRepos = {
  list: (projectId: string, token: T) => api<ProjectRepo[]>(`/projects/${projectId}/repos`, { token }),
  link: (projectId: string, provider: ProjectRepo['provider'], fullName: string, token: T) =>
    api<ProjectRepo>(`/projects/${projectId}/repos`, { method: 'POST', body: { provider, full_name: fullName }, token }),
  unlink: (projectId: string, provider: ProjectRepo['provider'], fullName: string, token: T) =>
    api<void>(`/projects/${projectId}/repos?${new URLSearchParams({ provider, full_name: fullName })}`, { method: 'DELETE', token }),
};

// Notifications: the signed-in user's inbox (internal; external channels later).
export type NotificationKind = 'assigned' | 'mention' | 'finished' | 'wont_do' | 'review' | 'sent_back' | 'approval';
export type AppNotification = {
  id: string; kind: NotificationKind; text: string; actor: string;
  ticket_id: string | null; ticket_key: string | null; board_id: string | null;
  created_at: string; read_at: string | null;
};
export const notifications = {
  list: (token: T, page = 1, perPage = 20) => api<AppNotification[]>(`/notifications?page=${page}&per_page=${perPage}`, { token }),
  unreadCount: (token: T) => api<{ count: number }>('/notifications/unread-count', { token }),
  read: (id: string, token: T) => api<void>(`/notifications/${id}/read`, { method: 'POST', token }),
  readAll: (token: T) => api<void>('/notifications/read-all', { method: 'POST', token }),
  dismiss: (id: string, token: T) => api<void>(`/notifications/${id}`, { method: 'DELETE', token }),
  clearRead: (token: T) => api<void>('/notifications/read', { method: 'DELETE', token }),
};

// Request intake: a project's public, unlisted form (no account) and the team's triage of what comes in.
export type IntakeSettings = { open: boolean; token: string | null };
export type IntakeRequest = { type: 'bug' | 'feature'; title: string; details?: string; contact?: string; website?: string };
export type IntakeSubmission = {
  id: string; project_id: string; type: 'bug' | 'feature'; title: string; details: string; contact: string;
  status: 'pending' | 'promoted' | 'dismissed'; ticket_id: string | null; ticket_key: string | null;
  decided_by: string | null; decided_at: string | null; created_at: string;
};
export const intake = {
  form: (token: string) => api<{ open: boolean }>(`/intake/${encodeURIComponent(token)}`),
  submit: (token: string, body: IntakeRequest) => api<void>(`/intake/${encodeURIComponent(token)}`, { method: 'POST', body }),
  settings: (projectId: string, t: T) => api<IntakeSettings>(`/projects/${projectId}/intake`, { token: t }),
  setOpen: (projectId: string, open: boolean, t: T, rotate = false) =>
    api<IntakeSettings>(`/projects/${projectId}/intake`, { method: 'PUT', body: { open, ...(rotate && { rotate }) }, token: t }),
  submissions: (projectId: string, t: T, status: IntakeSubmission['status'] = 'pending') =>
    api<IntakeSubmission[]>(`/projects/${projectId}/intake/submissions?status=${status}`, { token: t }),
  promote: (id: string, t: T) => api<IntakeSubmission>(`/intake-submissions/${id}/promote`, { method: 'POST', token: t }),
  dismiss: (id: string, t: T) => api<void>(`/intake-submissions/${id}/dismiss`, { method: 'POST', token: t }),
};

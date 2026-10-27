// Typed client for the Go backend. Shapes mirror backend/internal/*/postgres.go JSON tags.
// Browser calls go through the same-origin /api proxy (app/api/[...path]); server components
// call the backend directly via BACKEND_URL. Pass a Clerk session token as `token`
// (client: useAuth().getToken(), server: (await auth()).getToken()).
import { ERROR_MESSAGES } from './error-codes';
import { i18nFor, type Locale } from '../i18n';
import { isLocale, LANG_COOKIE } from '../i18n/locale';
import { reportClient, reportServer } from '../server/report';
import type { EstimateScale } from '../board/estimates';
import type { HelpEntry, PageKind } from '../site/help';

export type Visibility = 'public' | 'login_only' | 'team';

export type TicketType = 'bug' | 'feature' | 'task' | 'epic' | 'spike'; // epic: backlog only (TL-213); spike: timeboxed investigation (TL-502)
export type Ticket = {
  id: string; key?: string; column_id: string; title: string; description: string; position: number;
  project_id?: string; labels?: string[];
  type?: TicketType; sprint_id?: string | null; epic_id?: string | null; // epic_id: the epic it's part of (TL-215)
  created_by: string; assigned_to?: string | null; priority?: string;
  blocked?: boolean; // waits on tickets that aren't done yet
  estimate?: string | null; // on the board's estimate scale
  created_at?: string; updated_at?: string; // UTC ISO; show with <When>
  done_at?: string | null; resolved_at?: string | null; // set once it reached Done / was resolved
  started_at?: string | null; // first move out of the board's first column; null for historical tickets
  planned_sprint_id?: string | null; // a backlog ticket planned into a board's upcoming sprint (refinement)
  planned_sprint_number?: number | null; // that sprint's number-to-be and board, for "Sprint 6 · Backend" (TL-582)
  planned_board_name?: string | null;
  due_date?: string | null; // YYYY-MM-DD (TL-632); show with <DueBadge>
  external_source?: string | null; external_url?: string | null; // made by an integration, e.g. a Bugfixes report
  resolution?: 'done' | 'wont_do' | 'duplicate' | null; // how a backlog ticket was closed
  duplicate_of_id?: string | null; duplicate_of_key?: string | null; duplicate_of_title?: string | null;
  review_requested_at?: string | null; // an agent finished it on a review board: waiting for a person
  timebox_days?: number | null; timebox_hours?: number | null; // a spike's timebox (TL-502); null = not a spike or not yet timed
};
// A project ticket not on any board or sprint yet.
export type BacklogTicket = Omit<Ticket, 'column_id'> & { column_id: null; project_id: string; type: TicketType };
export type BacklogPage = { tickets: BacklogTicket[]; counts: Record<TicketType | 'all', number>; labels: ProjectLabel[] };
export type BacklogSort = 'manual' | 'newest' | 'oldest' | 'due';
export type BacklogPlanned = 'exclude' | 'only' | 'all'; // tickets planned into an upcoming sprint (TL-584)
// BacklogStatus: open tickets (the default), or closed ones: done, won't do, duplicates, or all of them
export type BacklogStatus = 'open' | 'done' | 'wont_do' | 'duplicate' | 'closed';
// A board's time box; the board shows only the open sprint's tickets.
export type Sprint = {
  id: string; board_id: string; number: number; length_days: number;
  starts_at: string; ends_at: string; closed_at: string | null;
  goal?: string; // one line the sprint is for; "" = none
};
export type Column = { id: string; name: string; position: number; tickets: Ticket[]; wip_limit?: number | null };
export type BoardStyle = 'sprints' | 'kanban';
export type WhenSprintEnds = 'start_next' | 'wait';
export type Board = {
  id: string; project_id: string; owner_clerk_id: string; name: string; description: string;
  team_id?: string | null;
  created_at: string; updated_at: string; columns?: Column[];
  style?: BoardStyle;
  hidden_done?: number; // kanban: Done tickets finished over 14 days ago, left off the board
  to_review?: number; // imported tickets set aside: no sprint can start or be planned until it's 0 (TL-541)
  estimate_scale?: EstimateScale;
  agent_review?: boolean; // agents' moves into Done wait for a person's review
  dev_complete_column_id?: string | null; // merged PRs land here, a release moves them to Done (TL-531)
  review_column_id?: string | null; // agents' finished work waits here for review (TL-592); null: the column before Done
  when_sprint_ends?: WhenSprintEnds; // TL-279: start the next sprint straight away, or end and wait for a manager
  last_sprint_number?: number; // the latest closed sprint, so a board between sprints can say which ended
  archived_at?: string | null; // archived: off the project page, history kept, no new work
  deletable?: boolean; // never used (no tickets, no sprints): can be deleted; otherwise archive it
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
  throughput: { week_start: string; tickets: number; median_cycle_days?: number | null; p85_cycle_days?: number | null }[];
  wip?: { column_id: string; column: string; tickets: number }[]; // open tickets per column now, Done left out (TL-621)
  mix?: { type: TicketType; tickets: number }[]; // done in the window, by type
};
export type RoadmapItem = {
  id: string; title: string; description: string; target_date: string | null; position: number;
  start_date?: string | null; // Gantt bar start (YYYY-MM-DD)
  manual_status?: 'not_started' | 'in_progress' | 'done';
  status?: 'not_started' | 'in_progress' | 'done'; // derived when tickets are linked
  progress?: { done: number; total: number }; // linked tickets done / total (everyone)
  tickets?: { id: string; title: string; done: boolean; type?: TicketType }[]; // linked tickets (owner only); an epic counts its sub-tickets (TL-216)
};
export type TicketComment = {
  id: string; ticket_id: string; parent_comment_id: string | null;
  body: string; author: string; created_at: string;
};
export type Roadmap = {
  id: string; project_id: string; title: string; description: string; visibility: Visibility;
  created_at: string; updated_at: string; progress?: { done: number; total: number }; items?: RoadmapItem[];
  can_manage?: boolean; // you can change it: an org admin or one of its project's team leaders (TL-413)
};
// A roadmap update (TL-87): dated, with a health; permanent once posted. author: by name (TL-413).
export type RoadmapHealth = 'on_track' | 'at_risk' | 'off_track';
export type RoadmapUpdate = { id: string; health: RoadmapHealth; note: string; published_at: string; author?: string };
// One week of a roadmap's burn-up (TL-616): linked tickets done by the week's end, of all linked then.
export type RoadmapBurnup = { week_start: string; done: number; total: number };
// A project holds a board per team plus its roadmaps; boards/roadmaps are only filled by projects.get.
export type Project = {
  id: string; name: string; description: string; key_prefix?: string; created_at: string; updated_at: string;
  boards?: Board[]; roadmaps?: Roadmap[];
  stats?: ProjectStats; // list only
};
// open/done: board tickets (done = last column); urgent: open urgent tickets anywhere; active: latest change
export type ProjectStats = { boards: number; roadmaps: number; open: number; done: number; backlog: number; urgent: number; active: string };
export type ProjectLabel = { label: string; count: number };
// personal: acts exactly as you, for your own scripts and displays (TL-451); service keys are the org's
export type ApiKeyKind = 'ai' | 'service' | 'personal';
// the client an AI agent's key is for (TL-269); matches components/settings/mcp-connect.tsx's setup steps
export type ApiKeyClient = 'claude-code' | 'claude-desktop' | 'codex' | 'cursor' | 'vscode' | 'gemini' | 'other';
export type ApiKey = {
  id: string; name: string; kind: ApiKeyKind; prefix: string; created_at: string; last_used_at: string | null;
  client?: ApiKeyClient | null; label?: string | null; // AI keys: their client, and an "other" agent's name
  display?: string; // what it's called: "Claude", or a service key's name
  expires_at?: string; // refused after this (TL-433)
  read_only?: boolean; // GET only (TL-450)
};
export type NewApiKey = ({ kind: 'ai'; client: ApiKeyClient; label?: string } | { kind: 'service' | 'personal'; name: string }) & { expires_in_days?: number; read_only?: boolean };
// the active organization's plan (TL-243). project_limit -1 = unlimited; billed = through Stripe, so there's
// billing to manage; can_manage = you're an org admin, who buys and manages it
// plan (TL-290): free 1 project, pro 5, enterprise unlimited; project_limit -1 is unlimited
export type PlanId = 'free' | 'pro' | 'enterprise';
export type Subscription = { plan?: PlanId; paid: boolean; project_limit: number; member_limit?: number; billed?: boolean; can_manage?: boolean }; // member_limit: -1 unlimited (TL-418)
export type PlanInfo = { id: PlanId; projects: number | null; members?: number | null; price: { amount: number; currency: string; interval: string } | null };

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

// ApiError: a failed call. code is the backend's error code when it sent one (TL-552), and message
// is then in the person's language (TL-558).
export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

// errorFrom reads a failed response: {"code","error"} JSON, or plain text from older backends.
export async function errorFrom(res: Response, locale: Locale = browserLocale()): Promise<ApiError> {
  const text = (await res.text()).trim();
  let code: string | undefined, message = text || res.statusText;
  if ((res.headers.get('content-type') ?? '').startsWith('application/json')) {
    try {
      const body = JSON.parse(text) as { code?: string; error?: string };
      code = body.code;
      message = body.error || res.statusText;
    } catch { /* not JSON after all: keep the text */ }
  }
  const known = code ? ERROR_MESSAGES[code] : undefined;
  return new ApiError(res.status, known ? i18nFor(locale)._(known) : message, code);
}

// browserLocale: the language the page is in (its cookie); on the server, English.
function browserLocale(): Locale {
  if (typeof document === 'undefined') return 'en';
  const v = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`))?.[1];
  return isLocale(v) ? v : 'en';
}

export type SearchQuery = { text?: string; project?: string; board?: string; types?: TicketType[]; priorities?: string[]; assignee?: string;
  creator?: string; status?: 'open' | 'done'; limit?: number; page?: number; match?: 'any';
  due?: 'overdue' | 'soon' | 'none'; sort?: 'due' }; // due: by the viewer's day (TL-632)

function searchParams(q: SearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (q.text?.trim()) params.set('q', q.text.trim());
  if (q.project) params.set('project', q.project);
  if (q.board) params.set('board', q.board);
  if (q.match) params.set('match', q.match); // any: one word will do, best matches first (TL-275)
  for (const type of q.types ?? []) params.append('type', type);
  for (const p of q.priorities ?? []) params.append('priority', p);
  if (q.assignee) params.set('assignee', q.assignee);
  if (q.creator) params.set('creator', q.creator); // "created by me" (TL-490)
  if (q.status) params.set('status', q.status);
  if (q.due) params.set('due', q.due);
  if (q.sort) params.set('sort', q.sort);
  if (q.page && q.page > 1) params.set('page', String(q.page));
  params.set('limit', String(q.limit ?? 20));
  return params;
}

function base(): string {
  if (typeof window === 'undefined') return `${process.env.BACKEND_URL ?? 'http://localhost:8080'}/api`;
  return process.env.NEXT_PUBLIC_API_URL ?? '/api';
}

type Options = { method?: string; body?: unknown; token?: string | null };

// Failed backend calls go to Bugfixes (TL-292): from the server directly, from the browser through
// /api/client-errors (the credentials never reach the browser). The UI still gets an ApiError.
async function reportBackendFailure(message: string, detail: string): Promise<void> {
  if (typeof window !== 'undefined') return reportClient('api', `${message}: ${detail}`);
  await reportServer(message, detail);
}

// In the browser, ask Clerk for the token at request time: the `token` callers hold can be minutes
// old (a form left open, a background tab), and Clerk tokens only live ~60s. Clerk refreshes as needed.
type ClerkSession = { getToken(o?: { skipCache?: boolean }): Promise<string | null> };
async function liveToken(passed: string | null | undefined, skipCache = false): Promise<string | null | undefined> {
  if (typeof window === 'undefined' || !passed) return passed; // server side, or a signed-out call
  const session = (window as { Clerk?: { session?: ClerkSession | null } }).Clerk?.session;
  return (await session?.getToken({ skipCache }).catch(() => null)) ?? passed;
}

// safeApiPath: a path built from a page's params (/r/[id]) can't climb out of /api: on the server
// these calls go straight to the backend, past the /api proxy's own checks (audit).
export function safeApiPath(path: string): boolean {
  return path.split('?')[0].split('/').every((seg) => {
    let s = seg;
    try { s = decodeURIComponent(seg); } catch { return false; }
    return s !== '.' && s !== '..' && !s.includes('\\') && !(s !== seg && s.includes('/'));
  });
}

export async function api<T>(path: string, { method = 'GET', body, token }: Options = {}): Promise<T> {
  if (!safeApiPath(path)) throw new ApiError(404, 'not found');
  const send = async (skipCache: boolean) => {
    // JSON errors carry a code the app translates (TL-558); other clients keep plain-text errors
    const headers: Record<string, string> = { Accept: 'application/json' };
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
    const err = await errorFrom(res);
    // the backend reports its own 5xx with the cause; from the browser that would only be a duplicate
    if (res.status >= 500 && typeof window === 'undefined') {
      await reportBackendFailure('backend returned a server error', `${method} ${path} (${res.status})`);
    }
    throw err;
  }
  if (res.status === 204) return undefined as T;
  // text answers (a report as Markdown, TL-401) come back as the text itself
  if ((res.headers.get('content-type') ?? '').startsWith('text/')) return (await res.text()) as T;
  return (await res.json()) as T;
}

// Fetch based SSE keeps the same Bearer auth and token refresh behavior as JSON API calls.
export function streamBoardLive(
  boardId: string, token: T, signal: AbortSignal,
  onEvent: (event: BoardLiveEvent) => void, onOpen?: () => void,
): Promise<void> {
  return streamLive(`/boards/${encodeURIComponent(boardId)}/live`, token, signal, onEvent, onOpen);
}

// streamLive reads a live channel (a board's, or a project's for hosted refinement) as server-sent events.
export async function streamLive(
  path: string, token: T, signal: AbortSignal,
  onEvent: (event: BoardLiveEvent) => void, onOpen?: () => void,
): Promise<void> {
  const request = async (skipCache: boolean) => {
    const t = await liveToken(token, skipCache);
    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    if (t) headers.Authorization = `Bearer ${t}`;
    return fetch(`${base()}${path}`, { headers, cache: 'no-store', signal });
  };
  let response = await request(false);
  if (response.status === 401 && token && typeof window !== 'undefined') response = await request(true);
  if (!response.ok) throw await errorFrom(response);
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
// WorkWeek (TL-510): working days 0 (Sunday)–6 (Saturday), the first day of the week, hours as minutes from midnight
export type WorkWeek = { days: number[]; week_start: number; start_minute: number; end_minute: number };
export type WorkWeeks = { org: WorkWeek; projects: Record<string, WorkWeek> };
export const workingWeek = {
  get: (token: T) => api<WorkWeeks>('/working-week', { token }),
  setOrg: (w: WorkWeek, token: T) => api<void>('/working-week', { method: 'PUT', body: w, token }),
  setProject: (project: string, w: WorkWeek, token: T) => api<void>(`/projects/${encodeURIComponent(project)}/working-week`, { method: 'PUT', body: w, token }),
  resetProject: (project: string, token: T) => api<void>(`/projects/${encodeURIComponent(project)}/working-week`, { method: 'DELETE', token }),
};

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
  flowMarkdown: (id: string, token: T, weeks = 12) => api<string>(`/boards/${id}/flow?weeks=${weeks}&format=md`, { token }), // the flow report (TL-621)
  create: (projectId: string, b: { name: string; description?: string; template_id?: string }, token: T) =>
    api<Board>(`/projects/${projectId}/boards`, { method: 'POST', body: b, token }),
  // Update the board name and/or settings; switching estimate_scale clears open tickets' estimates.
  update: (id: string, b: { name?: string; estimate_scale?: EstimateScale; style?: BoardStyle; agent_review?: boolean; dev_complete_column_id?: string; review_column_id?: string; when_sprint_ends?: WhenSprintEnds }, token: T) => api<void>(`/boards/${id}`, { method: 'PATCH', body: b, token }),
  remove: (id: string, token: T) => api<void>(`/boards/${id}`, { method: 'DELETE', token }), // never-used boards only
  archive: (id: string, token: T) => api<void>(`/boards/${id}/archive`, { method: 'POST', token }),
  restore: (id: string, token: T) => api<void>(`/boards/${id}/restore`, { method: 'POST', token }),
  archived: (projectId: string, token: T) => api<Board[]>(`/projects/${projectId}/archived-boards`, { token }),
};

// Hosted sessions (TL-221): someone hosts a refinement (per project) or standup (per board); others
// join and follow what the host has open.
export type HostedFocus = { ticketId: string | null; filters?: Record<string, string[]> };
export type HostedSession = { host: string; startedAt: number; focus: HostedFocus; people: string[] };
export type HostedPaths = { kind: 'refinement' | 'standup'; stream: string; session: string; start?: string; end?: string; base: string };
export const hostedPaths = {
  refinement: (projectId: string): HostedPaths => ({ kind: 'refinement', stream: `/projects/${projectId}/live`,
    session: `/projects/${projectId}/live/refinement`, start: `/projects/${projectId}/live/refinement`, end: `/projects/${projectId}/live/refinement`,
    base: `/projects/${projectId}/live/refinement` }),
  // a standup's session starts and ends with the standup itself
  standup: (boardId: string): HostedPaths => ({ kind: 'standup', stream: `/boards/${boardId}/live`,
    session: `/boards/${boardId}/live/standup/session`, base: `/boards/${boardId}/live/standup` }),
};
export const hosted = {
  get: (p: HostedPaths, token: T) => api<HostedSession>(p.session, { token }),
  start: (p: HostedPaths, token: T) => api<HostedSession>(p.start!, { method: 'POST', token }),
  end: (p: HostedPaths, token: T) => api<void>(p.end!, { method: 'DELETE', token }),
  join: (p: HostedPaths, token: T) => api<HostedSession>(`${p.base}/join`, { method: 'POST', token }),
  leave: (p: HostedPaths, token: T) => api<void>(`${p.base}/leave`, { method: 'POST', token }),
  focus: (p: HostedPaths, focus: HostedFocus, token: T) => api<HostedSession>(`${p.base}/focus`, { method: 'PUT', body: focus, token }),
  handOver: (p: HostedPaths, userId: string, token: T) => api<HostedSession>(`${p.base}/host`, { method: 'PUT', body: { user_id: userId }, token }),
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
  // the edit board page's save: every column in order, new ones without an id (TL-470)
  layout: (boardId: string, cols: { id?: string; name: string; wip_limit: number | null }[], token: T) =>
    api<void>(`/boards/${boardId}/columns`, { method: 'PUT', body: { columns: cols }, token }),
};

// A linked ticket under "blocked by" / "blocks".
export type Dep = { id: string; title: string; done: boolean };
// Child: a sub-ticket, with where it lives (board_id null: the backlog) so an epic can group them by board
export type Child = Dep & { key?: string | null; type?: TicketType; assigned_to?: string | null; estimate?: string | null; board_id?: string | null; board_name?: string | null };
// EpicProgress: an epic's direct sub-tickets, done of total, and their size in points (TL-213)
export type EpicProgress = { done: number; total: number; points: number; unestimated: number };
// MovedTicket: a sub-ticket that moves with its parent leaving the board (TL-218)
export type MovedTicket = { id: string; key: string | null; title: string };
export type EpicSummary = { id: string; key: string | null; title: string; priority: string; done: boolean; resolution: string | null; progress: EpicProgress };

// One ticket plus where it lives (board/column/sprint are null for backlog tickets) — /tickets/[id].
export type TicketDetail = Omit<Ticket, 'column_id'> & {
  column_id: string | null; project_id: string; project_name: string; type: TicketType;
  board_id: string | null; board_name: string | null; column_name: string | null; sprint_number: number | null;
  estimate_scale: EstimateScale; // the board's; 'none' in the backlog
  done: boolean; // in the board's last column: attachments locked
  blocked_by: Dep[]; blocks: Dep[];
  parent?: Dep | null; // this is a sub-ticket of parent
  children?: Child[]; // its sub-tickets
  epic?: EpicProgress; // an epic's progress and size
  duplicates?: { id: string; key: string; title: string }[];
};
export type TicketSearchResult = Ticket & {
  project_name: string; board_id: string | null; board_name: string | null; column_name: string | null;
  done: boolean; snippet: string;
};

export type Assignee = {
  id: string; label: string; kind?: 'person' | 'ai' | 'service'; name?: string; username?: string; image_url?: string; // name, username, image_url: people only
  // people only, with Google Calendar connected (TL-407): on holiday now (until: back, UTC), or leave this week
  away?: { until: string; company?: boolean }; away_next?: { from: string; until: string };
};

// HistoryEntry: one step in a ticket's lifecycle (TL-74/76): a stage it entered, or skipped on the way.
export type HistoryEntry = {
  at: string; stage: 'backlog' | 'column' | 'resolved'; outcome: 'entered' | 'skipped'; stage_order: number;
  board_id?: string; board_name?: string; column_id?: string; column_name?: string; done: boolean;
  resolution?: 'done' | 'wont_do' | 'duplicate'; actor?: string; // actor: user id or agent name; none = the system
};

// ActivityEntry: one thing that happened to a ticket (TL-679): a stage, an edit, an assignment, a comment, a
// file… action names it and data holds the details (the backend's OpenAPI lists them). Text changes say
// only that they happened. actor: a user id, or an agent's or service key's name; null for the system.
export type ActivityEntry = { id: string; at: string; actor: string | null; actor_kind: 'person' | 'agent' | 'service' | 'system'; action: string; data: Record<string, unknown> };

export const tickets = {
  get: (id: string, token: T) => api<TicketDetail>(`/tickets/${id}`, { token }),
  getByKey: (key: string, token: T) => api<TicketDetail>(`/ticket-keys/${encodeURIComponent(key)}`, { token }),
  // the Bugfixes panel for a ticket Bugfixes made (404 otherwise)
  bugfixes: (id: string, token: T) => api<TicketBugfixes>(`/tickets/${id}/bugfixes`, { token }),
  prs: (id: string, token: T) => api<TicketPR[]>(`/tickets/${id}/prs`, { token }), // pull requests that mention it (TL-283)
  history: (id: string, token: T) => api<HistoryEntry[]>(`/tickets/${id}/history`, { token }), // lifecycle, oldest first (TL-76)
  activity: (id: string, token: T) => api<ActivityEntry[]>(`/tickets/${id}/activity`, { token }), // everything that happened, oldest first (TL-679)
  epics: (projectId: string, token: T) => api<EpicSummary[]>(`/projects/${projectId}/epics`, { token }), // with progress and size (TL-213)
  group: (id: string, token: T) => api<MovedTicket[]>(`/tickets/${id}/group`, { token }), // open sub-tickets that would leave the board with it (TL-218)
  // also "My work": assignee 'me', status 'open', newest change first, paged
  search: (q: SearchQuery, token: T) => api<TicketSearchResult[]>(`/search?${searchParams(q)}`, { token }),
  // searchPage: one page plus how many tickets match in all, for "5 of 9" (TL-548)
  searchPage: (q: SearchQuery, token: T) => api<{ tickets: TicketSearchResult[]; total: number }>(`/search?${searchParams(q)}&total=1`, { token }),
  // review settles an agent's finished ticket: approve → Done, else back to the first column (comment added)
  review: (id: string, approve: boolean, comment: string, token: T) =>
    api<void>(`/tickets/${id}/review`, { method: 'POST', body: { approve, ...(comment.trim() && { comment: comment.trim() }) }, token }),
  // resolve closes a backlog ticket in place: done, or wont_do (decided against; the reason becomes a comment)
  org: (id: string, token: T) => api<{ org_id: string }>(`/tickets/${id}/org`, { token }), // which of my orgs it's in (TL-276)
  resolve: (id: string, token: T, resolution: 'done' | 'wont_do' = 'done', reason = '') =>
    api<void>(`/tickets/${id}/resolve`, { method: 'POST', body: { resolution, ...(reason.trim() && { reason: reason.trim() }) }, token }),
  duplicate: (id: string, duplicateOf: string, options: { copy_labels?: boolean; copy_comments?: boolean }, token: T) =>
    api<void>(`/tickets/${id}/duplicate`, { method: 'POST', body: { duplicate_of: duplicateOf, ...options }, token }),
  // assign hands a ticket to you (your user id) or an agent (API key name); null unassigns
  assign: (id: string, assignee: string | null, token: T) => api<Ticket>(`/tickets/${id}/assignee`, { method: 'PUT', body: { assignee }, token }),
  assignees: (token: T) => api<Assignee[]>('/assignees', { token }),
  // on the sprint's last day the ticket goes to the backlog instead: column_id null, redirected_to_backlog
  create: (columnId: string, t: { title: string; description?: string; type?: TicketType; priority?: string; labels?: string[]; estimate?: string; timebox_days?: number; timebox_hours?: number; due_date?: string }, token: T) =>
    api<Ticket & { redirected_to_backlog?: boolean }>(`/columns/${columnId}/tickets`, { method: 'POST', body: t, token }),
  update: (id: string, t: { title: string; description: string; type?: TicketType; priority?: string; estimate?: string; timebox_days?: number; timebox_hours?: number; due_date?: string }, token: T) => api<void>(`/tickets/${id}`, { method: 'PATCH', body: t, token }),
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
  // oldest first; readable by anyone who can read the roadmap (public ones need no token)
  updates: (id: string, token?: T) => api<RoadmapUpdate[]>(`/roadmaps/${id}/updates`, { token }),
  postUpdate: (id: string, u: { health: RoadmapHealth; note: string }, token: T) =>
    api<RoadmapUpdate>(`/roadmaps/${id}/updates`, { method: 'POST', body: u, token }),
  // the report (TL-616), for those who manage it: the burn-up for the PDF, or the whole thing as Markdown
  report: (id: string, token: T) => api<{ burnup: RoadmapBurnup[] }>(`/roadmaps/${id}/report`, { token }),
  reportMarkdown: (id: string, token: T) => api<string>(`/roadmaps/${id}/report?format=md`, { token }),
};

export const billing = {
  status: (token: T) => api<Subscription>('/subscription', { token }),
  checkout: (token: T, plan: 'pro' | 'enterprise' = 'pro') => api<{ url: string }>('/subscription/checkout', { method: 'POST', body: { plan }, token }),
  // an org already paying moves its subscription to the other plan, prorated (TL-290)
  changePlan: (plan: 'pro' | 'enterprise', token: T) => api<void>('/subscription/plan', { method: 'POST', body: { plan }, token }),
  plans: () => api<PlanInfo[]>('/plans'), // public: limits and Stripe prices
  portal: (token: T) => api<{ url: string }>('/subscription/portal', { method: 'POST', token }),
};

// API keys act as you; AI keys can be assigned tickets. Managing keys needs a signed-in session.
export const apiKeys = {
  list: (token: T) => api<ApiKey[]>('/keys', { token }),
  create: (input: NewApiKey, token: T) => api<ApiKey & { key: string }>('/keys', { method: 'POST', body: input, token }),
  revoke: (id: string, token: T) => api<void>(`/keys/${id}`, { method: 'DELETE', token }),
};

// Sprints are per board. Closing carries over every ticket not in the board's last column and
// creates the next sprint with the chosen length and optional future start date.
// Refinement: a board plans up to 2 sprints after its current one; backlog tickets are planned into
// them and sized. Capacity is velocity (last 3 closed sprints) + 10%; over it needs approval to start.
export type Capacity = {
  unit: 'points' | 'tickets'; velocity: number | null; cap: number | null; used: number; unestimated: number;
  over: boolean; approved_total: number | null; approved_by: string | null; approved_at: string | null; needs_approval: boolean;
  // the board team's time away over the sprint (Google Calendar); cap is already scaled by it. null: not connected / no team
  availability?: { percent: number; person_days_away: number } | null;
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

// Imported boards (TL-541/545): tickets an import set aside, untouched for over 6 months in the source,
// to keep (stays in the backlog) or close as won't do (tickets.resolve) before the first sprint.
export type ReviewTicket = { id: string; key: string; title: string; type: TicketType; priority: string; updated_at: string; url: string };
export const importReview = {
  list: (boardId: string, token: T) => api<ReviewTicket[]>(`/boards/${encodeURIComponent(boardId)}/import-review`, { token }),
  keep: (boardId: string, ticketId: string, token: T) =>
    api<void>(`/boards/${encodeURIComponent(boardId)}/import-review/${encodeURIComponent(ticketId)}/keep`, { method: 'POST', token }),
};

export const sprints = {
  list: (boardId: string, token: T) => api<Sprint[]>(`/boards/${boardId}/sprints`, { token }),
  start: (boardId: string, lengthDays: number, token: T, goal?: string) =>
    api<Sprint>(`/boards/${boardId}/sprints`, { method: 'POST', body: { length_days: lengthDays, ...(goal && { goal }) }, token }),
  setGoal: (id: string, goal: string, token: T) => api<Sprint>(`/sprints/${id}`, { method: 'PATCH', body: { goal }, token }), // "" clears
  updateLength: (id: string, lengthDays: number, token: T) =>
    api<Sprint>(`/sprints/${id}`, { method: 'PATCH', body: { length_days: lengthDays }, token }),
  // closing by hand only closes: the next sprint waits for start (its length chosen then); pass next to
  // open it at once instead (what auto-close does). No next: resolves with nothing (204).
  close: (id: string, token: T, next?: { next_length_days?: number; next_starts_at?: string }) =>
    api<Sprint | undefined>(`/sprints/${id}/close`, { method: 'POST', body: next, token }),
  velocity: (boardId: string, token: T) => api<Velocity>(`/boards/${boardId}/velocity`, { token }),
  get: (id: string, token: T) => api<SprintDetail>(`/sprints/${id}`, { token }),
};

// Velocity: what each closed sprint finished, and the open sprint's burn data (see lib/sprint/burn.ts).
export type Velocity = {
  unit: 'points' | 'tickets';
  // oldest first; planned: what the sprint held when it closed (null: closed before that was recorded)
  sprints: { number: number; starts_at: string; closed_at: string; completed: number; planned?: number | null }[];
  current: Burn | null;
  cap?: number | null; // a sprint's capacity, velocity + 10% (null: no closed sprints yet, so no limit) (TL-464)
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
  // one page, filtered and ordered by the server; counts drive the type tabs
  page: (projectId: string, q: { type?: TicketType; labels?: string[]; priorities?: string[]; sort?: BacklogSort; status?: BacklogStatus; planned?: BacklogPlanned; page: number; perPage: number; epic?: string }, token: T) => {
    const params = new URLSearchParams({ page: String(q.page), per_page: String(q.perPage) });
    if (q.type) params.set('type', q.type);
    if (q.sort && q.sort !== 'manual') params.set('sort', q.sort);
    if (q.status && q.status !== 'open') params.set('status', q.status);
    if (q.planned && q.planned !== 'all') params.set('planned', q.planned);
    for (const l of q.labels ?? []) params.append('label', l);
    for (const priority of q.priorities ?? []) params.append('priority', priority);
    if (q.epic) params.set('epic', q.epic); // an epic's sub-tickets only (TL-215)
    return api<BacklogPage>(`/projects/${projectId}/backlog/page?${params}`, { token });
  },
  create: (projectId: string, t: { title: string; description?: string; type: TicketType; priority?: string; labels?: string[]; timebox_days?: number; timebox_hours?: number; due_date?: string }, token: T) =>
    api<BacklogTicket>(`/projects/${projectId}/backlog`, { method: 'POST', body: t, token }),
  // its open sub-tickets on the board go too (TL-218): also_moved lists them
  send: (ticketId: string, token: T) => api<{ also_moved?: MovedTicket[] } | undefined>(`/tickets/${ticketId}/backlog`, { method: 'POST', token }),
};

// Files attached to a ticket (stored on UploadThing; the backend keeps the records).
export type Attachment = {
  id: string; ticket_id: string; key: string; url: string; name: string; size: number;
  content_type: string; created_by: string; created_at: string;
  delete_on?: string | null; // a year old (TL-259): the day it's deleted unless someone keeps it
};

export const attachments = {
  list: (ticketId: string, token: T) => api<Attachment[]>(`/tickets/${ticketId}/attachments`, { token }),
  add: (ticketId: string, f: { key: string; url: string; name: string; size: number; content_type: string }, token: T) =>
    api<Attachment>(`/tickets/${ticketId}/attachments`, { method: 'POST', body: f, token }),
  remove: (id: string, token: T) => api<void>(`/attachments/${id}`, { method: 'DELETE', token }),
  keep: (id: string, token: T) => api<void>(`/attachments/${id}/keep`, { method: 'POST', token }), // another year (admins, uploader)
  cleanup: (token: T) => api<FileCleanup>('/attachments/retention', { token }), // org admins only (TL-260)
};

// FileCleanup is the org's year-old file clean-up: files due to go (soonest first) and files gone (newest first).
type CleanupFile = { ticket_id: string; ticket_key: string; ticket_title: string; name: string; size: number; created_by: string };
export type FileCleanup = {
  due: (CleanupFile & { id: string; delete_on: string })[];
  deleted: (CleanupFile & { deleted_at: string })[];
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
// accounts: GitHub only, every GitHub account (org or user) the org connected (TL-281). workspaces:
// Bitbucket only, the workspaces the connected person belongs to (TL-286)
export type GitHubAccount = { installation_id: string; account: string; updated_by?: string; updated_at?: string };
export type IntegrationStatus = { provider: IntegrationProvider; connected: boolean; account?: string; accounts?: GitHubAccount[]; workspaces?: { slug: string; name: string }[]; base_url?: string; updated_by?: string; updated_at?: string };
// A pull request that mentions a ticket (its key, its link or one of our short links), newest first.
export type TicketPR = {
  provider: 'github' | 'bitbucket'; repo: string; number: number; url: string; title: string;
  state: 'open' | 'draft' | 'merged' | 'closed'; author: string; branch: string; updated_at: string;
  released_in?: string | null; // the release tag that shipped it (TL-531)
};
export type GitRepo = { full_name: string; default_branch: string; private: boolean };
export type ProjectRepo = { provider: 'github' | 'bitbucket'; full_name: string; default_branch: string; created_at?: string };

export const integrations = {
  status: (provider: IntegrationProvider, token: T) => api<IntegrationStatus>(`/integrations/${provider}`, { token }),
  // Bugfixes: paste an access token
  connect: (provider: 'bugfixes', input: { token: string; base_url?: string }, token: T) =>
    api<void>(`/integrations/${provider}`, { method: 'PUT', body: input, token }),
  // installation: GitHub, just that account (the org's others stay connected)
  disconnect: (provider: IntegrationProvider, token: T, installation?: string) =>
    api<void>(`/integrations/${provider}${installation ? `?installation=${encodeURIComponent(installation)}` : ''}`, { method: 'DELETE', token }),
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
export type NotificationKind = 'assigned' | 'mention' | 'finished' | 'wont_do' | 'review' | 'sent_back' | 'approval' | 'retention' | 'over_capacity' | 'legal' | 'downtime_credit' | 'sprint_waiting'; // retention: TL-259; over_capacity: a sprint started over capacity (TL-149)
export type AppNotification = {
  id: string; kind: NotificationKind; text: string; actor: string;
  ticket_id: string | null; ticket_key: string | null; board_id: string | null; link?: string | null; // link: a page, e.g. a new Terms version (TL-424)
  created_at: string; read_at: string | null;
};
// A ticket that @mentions the caller, as of its latest mention (GET /api/mentions).
export type Mention = {
  ticket_id: string; key: string; title: string; done: boolean; project_name: string;
  actor: string; comment_id: string; mentioned_at: string;
  muted: boolean; // not watching it any more (TL-587); it stays listed
};
export type MentionsPage = { mentions: Mention[]; total: number; page: number; per_page: number };
export type MentionStatus = 'open' | 'done' | 'all'; // done covers closed tickets too (TL-589)
export const mentions = {
  list: (token: T, limit = 10, status: MentionStatus = 'all') => api<Mention[]>(`/mentions?limit=${limit}&status=${status}`, { token }),
  // a page at a time with the total
  page: (token: T, page: number, perPage: number, status: MentionStatus) =>
    api<MentionsPage>(`/mentions/page?page=${page}&per_page=${perPage}&status=${status}`, { token }),
  // stop watching a ticket you're mentioned on, or watch it again (TL-587)
  mute: (ticketId: string, token: T) => api<void>(`/mentions/${ticketId}/mute`, { method: 'PUT', token }),
  unmute: (ticketId: string, token: T) => api<void>(`/mentions/${ticketId}/mute`, { method: 'DELETE', token }),
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
export type IntakeSettings = { open: boolean; token: string | null; can_manage?: boolean }; // can_manage: a signed-in org admin (TL-432)
export type IntakeRequest = { type: 'bug' | 'feature'; title: string; details?: string; contact?: string; website?: string };
export type IntakeSubmission = {
  id: string; project_id: string; type: 'bug' | 'feature'; title: string; details: string; contact: string;
  status: 'pending' | 'promoted' | 'dismissed'; ticket_id: string | null; ticket_key: string | null;
  decided_by: string | null; decided_at: string | null; created_at: string;
};
// The public contact form (POST /api/enquiries): messages go to the Tracklines team's inbox.
export type Enquiry = { name: string; email: string; company?: string; message: string; source_path?: string; website?: string };
export const enquiries = {
  send: (body: Enquiry) => api<void>('/enquiries', { method: 'POST', body }),
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

// Embedding (TL-494): the origins a project allows its public roadmap/request-form widgets to run on
// (per project since TL-683). Adding one opens the API's CORS to it; the project's managers manage the
// list (can_manage).
export type EmbedOrigin = { id: string; origin: string; created_by: string; created_at: string };
// A public embed key (tle_…) and the usage recorded against it; last_used is YYYY-MM-DD or null.
export type EmbedKey = { id: string; key: string; label: string; created_by: string; created_at: string; hits: number; origins: number; last_used: string | null };
export type EmbedUsage = { origin: string; resource: string; hits: number; last_used: string };
const embedPath = (project: string, rest: string) => `/projects/${encodeURIComponent(project)}/embed/${rest}`;
export const embed = {
  origins: (project: string, t: T) => api<{ origins: EmbedOrigin[]; can_manage: boolean }>(embedPath(project, 'origins'), { token: t }),
  addOrigin: (project: string, origin: string, t: T) => api<EmbedOrigin>(embedPath(project, 'origins'), { method: 'POST', body: { origin }, token: t }),
  removeOrigin: (project: string, id: string, t: T) => api<void>(embedPath(project, `origins/${encodeURIComponent(id)}`), { method: 'DELETE', token: t }),
  keys: (project: string, t: T) => api<{ keys: EmbedKey[]; can_manage: boolean }>(embedPath(project, 'keys'), { token: t }),
  createKey: (project: string, label: string, t: T) => api<EmbedKey>(embedPath(project, 'keys'), { method: 'POST', body: { label }, token: t }),
  deleteKey: (project: string, id: string, t: T) => api<void>(embedPath(project, `keys/${encodeURIComponent(id)}`), { method: 'DELETE', token: t }),
  keyUsage: (project: string, id: string, t: T) => api<EmbedUsage[]>(embedPath(project, `keys/${encodeURIComponent(id)}/usage`), { token: t }),
};

// Outbound webhooks (TL-636, on TL-635): an org's endpoints, admins only, Pro and Enterprise.
export const WEBHOOK_EVENTS = ['ticket.created', 'ticket.updated', 'ticket.moved', 'ticket.assigned', 'ticket.done', 'ticket.deleted',
  'comment.created', 'sprint.started', 'sprint.closed', 'roadmap.update_published'] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
export type WebhookEndpoint = {
  id: string; url: string; events: WebhookEvent[]; enabled: boolean; disabled_reason: 'failures' | 'manual' | null;
  consecutive_failures: number; secret_hint: string; created_at: string;
};
export type WebhookDelivery = {
  id: string; event: string; state: 'pending' | 'ok' | 'failed'; attempts: number; status_code: number | null; error: string | null;
  duration_ms: number | null; created_at: string; next_attempt_at: string | null; request_body: string; response_body: string | null;
};
const hook = (id: string) => `/org/webhooks/${encodeURIComponent(id)}`;
export const webhooks = {
  list: (t: T) => api<WebhookEndpoint[]>('/org/webhooks', { token: t }),
  create: (w: { url: string; events: WebhookEvent[] }, t: T) => api<{ endpoint: WebhookEndpoint; secret: string }>('/org/webhooks', { method: 'POST', body: w, token: t }),
  update: (id: string, w: { url?: string; events?: WebhookEvent[]; enabled?: boolean }, t: T) => api<WebhookEndpoint>(hook(id), { method: 'PATCH', body: w, token: t }),
  rotate: (id: string, t: T) => api<{ secret: string }>(`${hook(id)}/secret`, { method: 'POST', token: t }),
  remove: (id: string, t: T) => api<void>(hook(id), { method: 'DELETE', token: t }),
  test: (id: string, t: T) => api<void>(`${hook(id)}/test`, { method: 'POST', token: t }),
  deliveries: (id: string, page: number, t: T) => api<{ deliveries: WebhookDelivery[]; more: boolean }>(`${hook(id)}/deliveries?page=${page}`, { token: t }),
  redeliver: (id: string, delivery: string, t: T) => api<void>(`${hook(id)}/deliveries/${encodeURIComponent(delivery)}/redeliver`, { method: 'POST', token: t }),
};

// Imports (TL-536, the CSV source TL-637/638): a preview, then a run in the background, a report, and scrap.
export type ImportCounts = { projects: number; boards: number; columns: number; tickets: number; comments: number; attachments?: number };
export type ImportSkip = { kind: string; source_id: string; reason: string };
export type ImportProblem = { code: string; source_id?: string; message: string };
export type ImportBoard = { source_id: string; name: string; team_id: string | null; columns: string[] };
export type ImportProject = { source_id?: string; name: string; prefix: string; tickets: number; boards?: ImportBoard[] };
export type ImportPerson = { name: string; matched: boolean; tickets: number };
export type ImportJob = {
  id: string; source: string; state: 'previewing' | 'running' | 'cancelling' | 'done' | 'failed' | 'cancelled' | 'scrapped';
  problems?: ImportProblem[]; skipped?: ImportSkip[];
  planned?: ImportCounts; projects?: ImportProject[]; people?: ImportPerson[];
  progress: number; total: number; report: { created: ImportCounts; skipped: ImportSkip[] } | null; error?: string;
  scrappable?: boolean; // finished: false once anyone has worked on what it made
  notes?: { kind: string; source_id?: string; message: string }[]; // preview: worth knowing first (Linear's renumbered teams)
};
export type CSVField = 'title' | 'description' | 'type' | 'priority' | 'labels' | 'status' | 'due' | 'created';
export const importsApi = {
  previewCSV: (o: { csv: string; name: string; prefix: string; mapping: Partial<Record<CSVField, string>> }, t: T) =>
    api<ImportJob>('/imports', { method: 'POST', body: { source: 'csv', options: o }, token: t }),
  get: (id: string, t: T) => api<ImportJob>(`/imports/${encodeURIComponent(id)}`, { token: t }),
  run: (id: string, t: T) => api<ImportJob>(`/imports/${encodeURIComponent(id)}/run`, { method: 'POST', token: t }),
  cancel: (id: string, t: T) => api<void>(`/imports/${encodeURIComponent(id)}/cancel`, { method: 'POST', token: t }),
  scrap: (id: string, t: T) => api<void>(`/imports/${encodeURIComponent(id)}/scrap`, { method: 'POST', token: t }),
};
// Jira Cloud (TL-537/538): the connection an admin imports with (kept 30 days), its projects, and a preview.
export type JiraConnection = { site: string; email: string; account: string; created_by: string; created_at: string; expires_at: string };
export type JiraProject = { id: string; key: string; name: string };
export type JiraOptions = { projects: string[]; prefixes?: Record<string, string>; teams?: Record<string, string> };
export const jira = {
  connection: (t: T) => api<JiraConnection | null>('/imports/jira/connection', { token: t }),
  connect: (c: { site: string; email: string; token: string }, t: T) => api<JiraConnection>('/imports/jira/connection', { method: 'PUT', body: c, token: t }),
  extend: (t: T) => api<JiraConnection>('/imports/jira/connection/extend', { method: 'POST', token: t }),
  disconnect: (t: T) => api<void>('/imports/jira/connection', { method: 'DELETE', token: t }),
  projects: (t: T) => api<JiraProject[]>('/imports/jira/projects', { token: t }),
  preview: (o: JiraOptions, t: T) => api<ImportJob>('/imports', { method: 'POST', body: { source: 'jira', options: o }, token: t }),
};
// Linear (TL-654): the personal API key an admin imports a workspace with (kept 30 days), and a preview.
export type LinearConnection = { workspace: string; account: string; created_by: string; created_at: string; expires_at: string };
export type LinearOptions = { prefix?: string; teams?: Record<string, string> };
export const linear = {
  connection: (t: T) => api<LinearConnection | null>('/imports/linear/connection', { token: t }),
  connect: (key: string, t: T) => api<LinearConnection>('/imports/linear/connection', { method: 'PUT', body: { key }, token: t }),
  extend: (t: T) => api<LinearConnection>('/imports/linear/connection/extend', { method: 'POST', token: t }),
  disconnect: (t: T) => api<void>('/imports/linear/connection', { method: 'DELETE', token: t }),
  preview: (o: LinearOptions, t: T) => api<ImportJob>('/imports', { method: 'POST', body: { source: 'linear', options: o }, token: t }),
};
// The admin panel (TL-570), for ChewedFeed staff: everyone else gets 404 from every /staff route.
export type StaffCount = { total: number; day: number; week: number };
export type SystemStats = {
  organizations: StaffCount; plans: Record<string, number>; members: StaffCount; projects: StaffCount;
  boards: StaffCount; archived_boards: number; tickets: StaffCount; done_tickets: number; comments: StaffCount;
  attachments: StaffCount; attachment_bytes: number; api_keys: Record<string, number>;
  open_sprints: number; live_sessions: number; database_bytes: number;
};
// The help panel's answers (TL-575/579): published ones in a language, or every one for staff to edit.
export type HelpAnswer = {
  id: string; slug: string; question: Record<string, string>; answer: Record<string, string>; href: string; fallback_href: string;
  pages: PageKind[]; words: string; position: number; published: boolean; updated_by: string; updated_at: string;
};
export type HelpAnswerInput = Omit<HelpAnswer, 'id' | 'position' | 'updated_by' | 'updated_at'>;
export const help = {
  list: (locale: string, t: T) => api<HelpEntry[]>(`/help?locale=${encodeURIComponent(locale)}`, { token: t }),
};
// McpPromptVersion: one published version of the MCP pre-prompt (TL-674); body is left out of lists
export type McpPromptVersion = { version: number; body?: string; note: string; published_at: string; published_by?: string };

export const staff = {
  me: (t: T) => api<{ staff: boolean }>('/staff/me', { token: t }),
  mcpPrompt: (t: T) => api<{ current: McpPromptVersion | null; versions: McpPromptVersion[] }>('/staff/mcp-prompt', { token: t }),
  publishMcpPrompt: (body: string, note: string, t: T) => api<McpPromptVersion>('/staff/mcp-prompt', { method: 'POST', body: { body, note }, token: t }),
  stats: (t: T) => api<SystemStats>('/staff/stats', { token: t }), // counts only (TL-574)
  help: (t: T) => api<HelpAnswer[]>('/staff/help', { token: t }),
  addHelp: (a: HelpAnswerInput, t: T) => api<HelpAnswer>('/staff/help', { method: 'POST', body: a, token: t }),
  updateHelp: (id: string, a: HelpAnswerInput, t: T) => api<HelpAnswer>(`/staff/help/${encodeURIComponent(id)}`, { method: 'PUT', body: a, token: t }),
  deleteHelp: (id: string, t: T) => api<void>(`/staff/help/${encodeURIComponent(id)}`, { method: 'DELETE', token: t }),
  orderHelp: (ids: string[], t: T) => api<void>('/staff/help/order', { method: 'PUT', body: { ids }, token: t }),
  outages: (t: T) => api<Outage[]>('/staff/outages', { token: t }),
  addOutage: (o: { starts_at: string; ends_at: string; note: string }, t: T) => api<Outage>('/staff/outages', { method: 'POST', body: o, token: t }),
  deleteOutage: (id: string, t: T) => api<void>(`/staff/outages/${encodeURIComponent(id)}`, { method: 'DELETE', token: t }),
  previewCredits: (id: string, t: T) => api<CreditPreview>(`/staff/outages/${encodeURIComponent(id)}/preview`, { token: t }),
  applyCredits: (id: string, includeShort: boolean, t: T) =>
    api<CreditResult>(`/staff/outages/${encodeURIComponent(id)}/apply`, { method: 'POST', body: { include_short: includeShort }, token: t }),
};

// The downtime resolver, phase 1 (TL-576/580): outages and the Terms' credits for them.
export type Outage = { id: string; starts_at: string; ends_at: string; note: string; minutes: number; qualifies: boolean; days: string[]; clusters: string[]; credited: number };
export type DowntimeCredit = { org_id: string; plan: string; day: string; amount: number; currency: string; credited: boolean };
export type DowntimeProblem = { org_id: string; error: string };
export type CreditPreview = { outage: Outage; credits: DowntimeCredit[]; problems: DowntimeProblem[] };
export type CreditResult = { credited: DowntimeCredit[]; problems: DowntimeProblem[] };
// exportCSV: a project's tickets as CSV text (TL-637), for the browser to save.
// AuditEvent: one entry in the org's audit log (TL-670): who did what across the organization.
export type AuditEvent = {
  id: string; at: string; actor: string | null; actor_kind: 'person' | 'agent' | 'service' | 'system'; action: string;
  target_type: string | null; target_id: string | null; project_id: string | null; data: Record<string, unknown>;
};
export type AuditPage = { events: AuditEvent[]; next_cursor: string | null };
// AuditFilters: the log's filters, as the backend takes them (from/to are RFC 3339; action is exact, or a prefix ending in ".")
export type AuditFilters = { actor?: string; action?: string; project?: string; from?: string; to?: string; cursor?: string };
const auditQuery = (f: AuditFilters) => new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
export const auditLog = {
  list: (f: AuditFilters, token: T) => api<AuditPage>(`/org/audit?${auditQuery(f)}`, { token }),
  exportCSV: (f: AuditFilters, token: T) => api<string>(`/org/audit/export.csv?${auditQuery({ ...f, cursor: undefined })}`, { token }),
};

export const exportCSV = (projectId: string, t: T) => api<string>(`/projects/${encodeURIComponent(projectId)}/export.csv`, { token: t });

// Web Push: notifications on this device even when Tracklines is closed (if the server has VAPID keys).
export type PushSettings = { enabled: boolean; public_key?: string };
export const push = {
  settings: (t: T) => api<PushSettings>('/push', { token: t }),
  subscribe: (subscription: PushSubscriptionJSON, t: T) => api<void>('/push/subscriptions', { method: 'POST', body: subscription, token: t }),
  unsubscribe: (endpoint: string, t: T) => api<void>('/push/subscriptions', { method: 'DELETE', body: { endpoint }, token: t }),
};

// Short links for "Copy link" (TL-277): our own site's links only, through 1tn.
export const shortLinks = {
  // title: shown for the link (1tn can't read our pages); public, so nothing private in it
  create: (url: string, title: string, token: T) => api<{ url: string }>('/short-links', { method: 'POST', body: { url, title }, token }),
};

// Google Chat (TL-288): notifications posted into a space, a project's or the whole org's (no projectId).
export type ChatKind = 'created' | 'review' | 'approval' | 'over_capacity' | 'finished' | 'wont_do' | 'assigned' | 'sent_back' | 'retention';
export type ChatSpace = { connected: boolean; kinds: ChatKind[]; updated_by?: string; updated_at?: string };
const chatScope = (projectId?: string) => (projectId ? `?project_id=${encodeURIComponent(projectId)}` : '');
// Google Chat app (TL-289): your own notifications in your chat with the Tracklines app, once linked
export type ChatLink = { available: boolean; linked: boolean; linked_at?: string };
export const chatApp = {
  status: (token: T) => api<ChatLink>('/me/google-chat', { token }),
  linkCode: (code: string, token: T) => api<{ google: string }>(`/me/google-chat/link?code=${encodeURIComponent(code)}`, { token }),
  link: (code: string, token: T) => api<{ linked: boolean }>('/me/google-chat/link', { method: 'POST', body: { code }, token }),
  unlink: (token: T) => api<void>('/me/google-chat', { method: 'DELETE', token }),
};

// Google Calendar (TL-404): who's on holiday. Members see whether it's connected; admins connect it
// (after letting our service account read calendars in Google: client_id and scope), test, sync it.
export type CalendarConnection = {
  domain: string; admin_email?: string; holidays_calendar: string; connected_at: string;
  last_sync_at: string | null; last_sync_error: string;
};
export type CalendarStatus = { available: boolean; connected: boolean; client_id?: string; scope: string; connection?: CalendarConnection };
// Sprint reports (TL-396/397): how a board's sprints went over a period. Never per person.
export type ReportMix = { type: TicketType; count: number; value: number };
export type SprintReport = {
  number: number; starts_at: string; ends_at: string; closed_at: string | null; goal: string; goal_met: boolean | null;
  planned: number; estimated?: boolean; done: number; predictability: number | null; added: number | null; removed: number | null;
  carried: number | null; velocity: number | null; approved_over: number | null; mix: ReportMix[];
};
export type ReportTotals = {
  sprints: number; planned: number; done: number; predictability: number | null; added: number | null;
  carried: number | null; velocity: number | null; mix: ReportMix[];
};
export type BoardReport = {
  board_id: string; board_name: string; unit: 'points' | 'tickets'; from: string; to: string;
  sprints: SprintReport[]; totals: ReportTotals; previous: ReportTotals; summary: string;
  spikes?: ReportSpikes; // TL-508; absent from an older backend
};
// Timeboxed spikes finished in the period, against their timebox in business hours (TL-508).
export type ReportSpikes = { done: number; within: number; over: number; over_hours: number };
// A project's boards, or every project, together (TL-398): points and tickets apart, predictability across both.
export type ReportOverall = { sprints: number; predictability: number | null; goals_set: number; goals_met: number };
export type ReportMonth = { month: string; sprints: number; predictability: number | null; points_done: number; tickets_done: number };
export type RollupReport = {
  id?: string; name: string; from: string; to: string;
  boards?: BoardReport[]; projects?: RollupReport[];
  points: ReportTotals | null; tickets: ReportTotals | null;
  overall: ReportOverall; previous: ReportOverall; months?: ReportMonth[]; summary: string;
};
const rangeQuery = (range: { from?: string; to?: string }) => new URLSearchParams(Object.entries(range).filter(([, v]) => v) as [string, string][]);
// from, to: YYYY-MM-DD, whole days in the caller's time zone (to inclusive); omitted: the last 90 days
export const reports = {
  board: (boardId: string, range: { from?: string; to?: string }, token: T) => api<BoardReport>(`/boards/${boardId}/reports/sprints?${rangeQuery(range)}`, { token }),
  project: (projectId: string, range: { from?: string; to?: string }, token: T) => api<RollupReport>(`/projects/${projectId}/reports/sprints?${rangeQuery(range)}`, { token }),
  org: (range: { from?: string; to?: string }, token: T) => api<RollupReport>(`/org/reports/sprints?${rangeQuery(range)}`, { token }), // org admins only
  // the same report as a Markdown document (TL-399), for downloading or copying
  markdown: (scope: { kind: 'board' | 'project'; id: string } | { kind: 'org' }, range: { from: string; to: string }, token: T) =>
    api<string>(`${scope.kind === 'org' ? '/org' : `/${scope.kind === 'board' ? 'boards' : 'projects'}/${scope.id}`}/reports/sprints?${rangeQuery(range)}&format=md`, { token }),
};

export const googleCalendar = {
  get: (token: T) => api<CalendarStatus>('/integrations/google-calendar', { token }),
  connect: (input: { domain: string; admin_email: string; holidays_calendar?: string }, token: T) =>
    api<void>('/integrations/google-calendar', { method: 'PUT', body: input, token }),
  test: (token: T) => api<void>('/integrations/google-calendar/test', { method: 'POST', token }),
  sync: (token: T) => api<CalendarConnection>('/integrations/google-calendar/sync', { method: 'POST', token }),
  remove: (token: T) => api<void>('/integrations/google-calendar', { method: 'DELETE', token }),
};

export const googleChat = {
  get: (token: T, projectId?: string) => api<ChatSpace>(`/google-chat${chatScope(projectId)}`, { token }),
  // url: the space's incoming webhook; leave it out to change only the kinds
  set: (input: { project_id?: string; url?: string; kinds: ChatKind[] }, token: T) => api<void>('/google-chat', { method: 'PUT', body: input, token }),
  remove: (token: T, projectId?: string) => api<void>(`/google-chat${chatScope(projectId)}`, { method: 'DELETE', token }),
  test: (token: T, projectId?: string) => api<void>('/google-chat/test', { method: 'POST', body: { project_id: projectId }, token }),
};

// me: the signed-in person's own preferences.
export const me = {
  // language (TL-553): null follows the browser
  language: (token: T) => api<{ language: string | null }>('/me/language', { token }),
  setLanguage: (language: string | null, token: T) => api<void>('/me/language', { method: 'PUT', body: { language }, token }),
};

// Typed client for the Go backend. Shapes mirror backend/internal/*/postgres.go JSON tags.
// Browser calls go through the same-origin /api proxy (app/api/[...path]); server components
// call the backend directly via BACKEND_URL. Pass a Clerk session token as `token`
// (client: useAuth().getToken(), server: (await auth()).getToken()).
import type { EstimateScale } from './estimates';

export type Visibility = 'public' | 'login_only' | 'team';

export type TicketType = 'bug' | 'feature' | 'task';
export type Ticket = {
  id: string; column_id: string; title: string; description: string; position: number;
  project_id?: string; labels?: string[];
  type?: TicketType; sprint_id?: string | null;
  created_by: string; assigned_to?: string | null; priority?: string;
  blocked?: boolean; // waits on tickets that aren't done yet
  estimate?: string | null; // on the board's estimate scale
};
// A project ticket not on any board or sprint yet.
export type BacklogTicket = Omit<Ticket, 'column_id'> & { column_id: null; project_id: string; type: TicketType };
export type BacklogPage = { tickets: BacklogTicket[]; counts: Record<TicketType | 'all', number>; labels: ProjectLabel[] };
// A board's time box; the board shows only the open sprint's tickets.
export type Sprint = {
  id: string; board_id: string; number: number; length_days: number;
  starts_at: string; ends_at: string; closed_at: string | null;
};
export type Column = { id: string; name: string; position: number; tickets: Ticket[] };
export type Board = {
  id: string; project_id: string; owner_clerk_id: string; name: string; description: string;
  created_at: string; updated_at: string; columns?: Column[];
  estimate_scale?: EstimateScale;
  sprint?: Sprint; // open sprint, absent when the board doesn't run sprints
  stats?: BoardStats; // a project's boards only
};
// counts the tickets the board shows (open sprint's, or all); in_progress = past the first column, not done
export type BoardStats = { open: number; in_progress: number; done: number; urgent: number; active: string; sprint_number: number | null; sprint_ends_at: string | null };
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
  id: string; name: string; description: string; created_at: string; updated_at: string;
  boards?: Board[]; roadmaps?: Roadmap[];
  stats?: ProjectStats; // list only
};
// open/done: board tickets (done = last column); urgent: open urgent tickets anywhere; active: latest change
export type ProjectStats = { boards: number; roadmaps: number; open: number; done: number; backlog: number; urgent: number; active: string };
export type ProjectLabel = { label: string; count: number };
export type ApiKeyKind = 'ai' | 'service';
export type ApiKey = { id: string; name: string; kind: ApiKeyKind; prefix: string; created_at: string; last_used_at: string | null };
export type Subscription = { paid: boolean; project_limit: number }; // project_limit -1 = unlimited

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

type T = string | null | undefined;

// One line per backend route (see backend/internal/service.go).
export const projects = {
  list: (token: T) => api<Project[]>('/projects', { token }),
  get: (id: string, token: T) => api<Project>(`/projects/${id}`, { token }),
  create: (p: { name: string; description?: string }, token: T) => api<Project>('/projects', { method: 'POST', body: p, token }),
  update: (id: string, p: { name: string; description: string }, token: T) => api<void>(`/projects/${id}`, { method: 'PATCH', body: p, token }),
  remove: (id: string, token: T) => api<void>(`/projects/${id}`, { method: 'DELETE', token }),
  labels: (id: string, token: T) => api<ProjectLabel[]>(`/projects/${id}/labels`, { token }),
};

export const boards = {
  get: (id: string, token: T) => api<Board>(`/boards/${id}`, { token }),
  create: (projectId: string, b: { name: string; description?: string }, token: T) =>
    api<Board>(`/projects/${projectId}/boards`, { method: 'POST', body: b, token }),
  // Update the board name and/or settings; switching estimate_scale clears open tickets' estimates.
  update: (id: string, b: { name?: string; estimate_scale?: EstimateScale }, token: T) => api<void>(`/boards/${id}`, { method: 'PATCH', body: b, token }),
  remove: (id: string, token: T) => api<void>(`/boards/${id}`, { method: 'DELETE', token }),
};

export const columns = {
  create: (boardId: string, name: string, token: T) => api<Omit<Column, 'tickets'>>(`/boards/${boardId}/columns`, { method: 'POST', body: { name }, token }),
  rename: (id: string, name: string, token: T) => api<void>(`/columns/${id}`, { method: 'PATCH', body: { name }, token }),
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

export type Assignee = { id: string; label: string; kind?: 'person' | 'ai' | 'service' };

export const tickets = {
  get: (id: string, token: T) => api<TicketDetail>(`/tickets/${id}`, { token }),
  // assign hands a ticket to you (your user id) or an agent (API key name); null unassigns
  assign: (id: string, assignee: string | null, token: T) => api<Ticket>(`/tickets/${id}/assignee`, { method: 'PUT', body: { assignee }, token }),
  assignees: (token: T) => api<Assignee[]>('/assignees', { token }),
  create: (columnId: string, t: { title: string; description?: string; type?: TicketType; priority?: string; labels?: string[]; estimate?: string }, token: T) =>
    api<Ticket>(`/columns/${columnId}/tickets`, { method: 'POST', body: t, token }),
  update: (id: string, t: { title: string; description: string; type?: TicketType; priority?: string; estimate?: string }, token: T) => api<void>(`/tickets/${id}`, { method: 'PATCH', body: t, token }),
  setLabels: (id: string, labels: string[], token: T) => api<{ labels: string[] }>(`/tickets/${id}/labels`, { method: 'PUT', body: { labels }, token }),
  remove: (id: string, token: T) => api<void>(`/tickets/${id}`, { method: 'DELETE', token }),
  // dependencies: replace what ticket {id} waits on (same project, no loops); claim is refused while blocked
  // setParent makes id a sub-ticket of parentId (null detaches)
  setParent: (id: string, parentId: string | null, token: T) => api<void>(`/tickets/${id}/parent`, { method: 'PUT', body: { parent_id: parentId }, token }),
  setBlockedBy: (id: string, ticketIds: string[], token: T) => api<void>(`/tickets/${id}/blocked-by`, { method: 'PUT', body: { ticket_ids: ticketIds }, token }),
  move: (id: string, columnId: string, position: number, token: T) =>
    api<void>(`/tickets/${id}/move`, { method: 'POST', body: { column_id: columnId, position }, token }),
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

// Sprints are per board. Closing opens the next sprint (same length) and carries over every
// ticket not in the board's last column; overdue sprints also close themselves.
export const sprints = {
  list: (boardId: string, token: T) => api<Sprint[]>(`/boards/${boardId}/sprints`, { token }),
  start: (boardId: string, lengthDays: number, token: T) =>
    api<Sprint>(`/boards/${boardId}/sprints`, { method: 'POST', body: { length_days: lengthDays }, token }),
  close: (id: string, token: T) => api<Sprint>(`/sprints/${id}/close`, { method: 'POST', token }),
  velocity: (boardId: string, token: T) => api<Velocity>(`/boards/${boardId}/velocity`, { token }),
};

// Velocity: what each closed sprint finished, and the open sprint's burn data (see lib/burn.ts).
export type Velocity = {
  unit: 'points' | 'tickets';
  sprints: { number: number; starts_at: string; closed_at: string; completed: number }[]; // oldest first
  current: Burn | null;
};
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
  page: (projectId: string, q: { type?: TicketType; labels?: string[]; page: number; perPage: number }, token: T) => {
    const params = new URLSearchParams({ page: String(q.page), per_page: String(q.perPage) });
    if (q.type) params.set('type', q.type);
    for (const l of q.labels ?? []) params.append('label', l);
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

// Typed client for the Go backend. Shapes mirror backend/internal/*/postgres.go JSON tags.
// Browser calls go through the same-origin /api proxy (app/api/[...path]); server components
// call the backend directly via BACKEND_URL. Pass a Clerk session token as `token`
// (client: useAuth().getToken(), server: (await auth()).getToken()).

export type Visibility = 'public' | 'login_only' | 'team';

export type Ticket = { id: string; column_id: string; title: string; description: string; position: number };
export type Column = { id: string; name: string; position: number; tickets: Ticket[] };
export type Board = {
  id: string; project_id: string; owner_clerk_id: string; name: string; description: string;
  created_at: string; updated_at: string; columns?: Column[];
};
export type RoadmapItem = { id: string; title: string; description: string; target_date: string | null; position: number };
export type Roadmap = {
  id: string; project_id: string; title: string; description: string; visibility: Visibility;
  created_at: string; updated_at: string; items?: RoadmapItem[];
};
// A project holds a board per team plus its roadmaps; boards/roadmaps are only filled by projects.get.
export type Project = {
  id: string; name: string; description: string; created_at: string; updated_at: string;
  boards?: Board[]; roadmaps?: Roadmap[];
};
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

export async function api<T>(path: string, { method = 'GET', body, token }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(base() + path, {
      method, headers, cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
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
};

export const boards = {
  get: (id: string, token: T) => api<Board>(`/boards/${id}`, { token }),
  create: (projectId: string, b: { name: string; description?: string }, token: T) =>
    api<Board>(`/projects/${projectId}/boards`, { method: 'POST', body: b, token }),
  remove: (id: string, token: T) => api<void>(`/boards/${id}`, { method: 'DELETE', token }),
};

export const columns = {
  create: (boardId: string, name: string, token: T) => api<Omit<Column, 'tickets'>>(`/boards/${boardId}/columns`, { method: 'POST', body: { name }, token }),
  rename: (id: string, name: string, token: T) => api<void>(`/columns/${id}`, { method: 'PATCH', body: { name }, token }),
  remove: (id: string, token: T) => api<void>(`/columns/${id}`, { method: 'DELETE', token }),
  reorder: (boardId: string, ids: string[], token: T) => api<void>(`/boards/${boardId}/columns/order`, { method: 'PUT', body: { column_ids: ids }, token }),
};

export const tickets = {
  create: (columnId: string, t: { title: string; description?: string }, token: T) =>
    api<Ticket>(`/columns/${columnId}/tickets`, { method: 'POST', body: t, token }),
  update: (id: string, t: { title: string; description: string }, token: T) => api<void>(`/tickets/${id}`, { method: 'PATCH', body: t, token }),
  remove: (id: string, token: T) => api<void>(`/tickets/${id}`, { method: 'DELETE', token }),
  move: (id: string, columnId: string, position: number, token: T) =>
    api<void>(`/tickets/${id}/move`, { method: 'POST', body: { column_id: columnId, position }, token }),
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
  setItems: (id: string, items: Pick<RoadmapItem, 'title' | 'description' | 'target_date'>[], token: T) =>
    api<void>(`/roadmaps/${id}/items`, { method: 'PUT', body: items, token }),
};

export const billing = {
  status: (token: T) => api<Subscription>('/subscription', { token }),
  checkout: (token: T) => api<{ url: string }>('/subscription/checkout', { method: 'POST', token }),
  portal: (token: T) => api<{ url: string }>('/subscription/portal', { method: 'POST', token }),
};

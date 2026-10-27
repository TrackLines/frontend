// The guide observes real UI actions. It never clicks submit or creates example data itself.
export const CHAPTERS = ['project', 'ticket', 'github', 'tui', 'mcp'] as const;
export type Chapter = typeof CHAPTERS[number];
export type Stage = 'project-new' | 'project-name' | 'project-submit' | 'ticket-project' | 'ticket-backlog' | 'ticket-add' | 'ticket-title' | 'ticket-submit' | 'github' | 'tui' | 'mcp' | 'done';
export type Tour = { chapters: Chapter[]; chapter: number; stage: Stage; projectId: string | null; completed: Chapter[] };
export type GuideAction = { type: 'next' | 'new-project' | 'add-backlog' | 'backlog-tab' | 'project-dialog-closed' | 'ticket-dialog-closed' | 'ticket-created' | 'use-existing' } | { type: 'project-opened' | 'project-created'; projectId: string };
export const GUIDE_ACTION = 'tracklines:guide-action';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function startTour(chapter: Chapter | 'all', projectId: string | null, completed: Chapter[] = [], allowed: readonly Chapter[] = CHAPTERS): Tour {
  const validProject = projectId && uuid.test(projectId) ? projectId : null;
  const requested = chapter === 'all' ? [...CHAPTERS] : chapter === 'ticket' && !validProject ? ['project', 'ticket'] as Chapter[] : [chapter];
  const chapters = chapter === 'ticket' && !validProject && !allowed.includes('project') ? [] : requested.filter((c) => allowed.includes(c));
  return { chapters, chapter: 0, stage: chapters.length ? first(chapters[0]) : 'done', projectId: validProject, completed };
}

function first(chapter: Chapter): Stage {
  return chapter === 'project' ? 'project-new' : chapter === 'ticket' ? 'ticket-project' : chapter;
}

function finishChapter(tour: Tour): Tour {
  const completed = [...new Set([...tour.completed, tour.chapters[tour.chapter]])];
  const chapter = tour.chapter + 1;
  return { ...tour, completed, chapter, stage: chapter < tour.chapters.length ? first(tour.chapters[chapter]) : 'done' };
}

export function advanceTour(tour: Tour, action: GuideAction): Tour {
  const stage = tour.stage;
  if (action.type === 'project-created' && stage.startsWith('project-') && uuid.test(action.projectId)) {
    const next = finishChapter({ ...tour, projectId: action.projectId });
    return next.stage === 'ticket-project' ? { ...next, stage: 'ticket-backlog' } : next;
  }
  if (action.type === 'use-existing' && stage === 'project-new' && tour.projectId) return finishChapter(tour);
  if (action.type === 'project-dialog-closed' && (stage === 'project-name' || stage === 'project-submit')) return { ...tour, stage: 'project-new' };
  if (action.type === 'ticket-dialog-closed' && (stage === 'ticket-title' || stage === 'ticket-submit')) return { ...tour, stage: 'ticket-add' };
  if (action.type === 'ticket-created' && (stage === 'ticket-title' || stage === 'ticket-submit')) return finishChapter(tour);
  if (action.type === 'project-opened' && stage === 'ticket-project' && uuid.test(action.projectId)) return { ...tour, projectId: action.projectId, stage: 'ticket-backlog' };
  const stages: Partial<Record<Stage, [GuideAction['type'], Stage]>> = {
    'project-new': ['new-project', 'project-name'],
    'project-name': ['next', 'project-submit'],
    'ticket-backlog': ['backlog-tab', 'ticket-add'],
    'ticket-add': ['add-backlog', 'ticket-title'],
    'ticket-title': ['next', 'ticket-submit'],
  };
  const transition = stages[stage];
  if (transition && action.type === transition[0]) return { ...tour, stage: transition[1] };
  if (action.type === 'next' && (stage === 'github' || stage === 'tui' || stage === 'mcp')) return finishChapter(tour);
  return tour;
}

export function tourStep(tour: Tour): { path: string; target: string; action: boolean } | null {
  const stages: Record<Exclude<Stage, 'done'>, [string, string, boolean]> = {
    'project-new': ['/dashboard', 'new-project', true],
    'project-name': ['/dashboard', 'project-name', false],
    'project-submit': ['/dashboard', 'project-submit', true],
    'ticket-project': ['/dashboard', 'project-card', true],
    'ticket-backlog': [`/projects/${tour.projectId}`, 'backlog-tab', true],
    'ticket-add': [`/projects/${tour.projectId}`, 'add-backlog', true],
    'ticket-title': [`/projects/${tour.projectId}`, 'backlog-title', false],
    'ticket-submit': [`/projects/${tour.projectId}`, 'backlog-submit', true],
    github: ['/settings/integrations', 'github-integration', false],
    tui: ['/docs/tui', 'tui-install', false],
    mcp: ['/docs/mcp', 'mcp-connect', false],
  };
  if (tour.stage === 'done') return null;
  const [path, target, action] = stages[tour.stage];
  return { path, target: `[data-guide="${target}"]`, action };
}

export function guideCovered(completed: Chapter[], allowed: readonly Chapter[] = CHAPTERS) {
  return allowed.length > 0 && allowed.every((chapter) => completed.includes(chapter));
}

export function emitGuideAction(action: GuideAction) {
  window.dispatchEvent(new CustomEvent(GUIDE_ACTION, { detail: action }));
}

// Delegation survives Next.js route changes and portaled dialogs. Only the real target advances it.
export function listenForGuideActions(doc: Document, dispatch: (action: GuideAction) => void) {
  const click = (event: Event) => {
    const target = (event.target as Element | null)?.closest?.('[data-guide]');
    if (!target || target.matches(':disabled,[aria-disabled="true"]')) return;
    const name = target.getAttribute('data-guide');
    if (name === 'new-project' || name === 'add-backlog' || name === 'backlog-tab') dispatch({ type: name });
    if (name === 'project-card') {
      const projectId = target.getAttribute('data-project-id');
      if (projectId && uuid.test(projectId)) dispatch({ type: 'project-opened', projectId });
    }
  };
  const custom = (event: Event) => {
    const action: unknown = (event as CustomEvent).detail;
    if (!action || typeof action !== 'object' || !('type' in action)) return;
    if (action.type === 'project-created' && 'projectId' in action && typeof action.projectId === 'string' && uuid.test(action.projectId)) dispatch({ type: 'project-created', projectId: action.projectId });
    if (action.type === 'ticket-created' || action.type === 'project-dialog-closed' || action.type === 'ticket-dialog-closed') dispatch({ type: action.type });
  };
  doc.addEventListener('click', click, true);
  doc.defaultView?.addEventListener(GUIDE_ACTION, custom);
  return () => { doc.removeEventListener('click', click, true); doc.defaultView?.removeEventListener(GUIDE_ACTION, custom); };
}

export function waitForGuideTarget(doc: Document, selector: string, signal: AbortSignal, timeout = 15000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    let observer: MutationObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clean = () => { observer?.disconnect(); clearTimeout(timer); signal.removeEventListener('abort', abort); };
    const abort = () => { clean(); reject(new Error('aborted')); };
    const check = () => {
      const target = [...doc.querySelectorAll<HTMLElement>(selector)].find((el) => !el.closest('[hidden],[inert],[aria-hidden="true"]'));
      if (target) { clean(); resolve(target); return true; }
      return false;
    };
    if (signal.aborted) { abort(); return; }
    if (check()) return;
    signal.addEventListener('abort', abort, { once: true });
    const Observer = doc.defaultView?.MutationObserver;
    if (!Observer) { reject(new Error('no document')); return; }
    observer = new Observer(check);
    observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true });
    timer = setTimeout(() => { clean(); reject(new Error('target unavailable')); }, timeout);
  });
}

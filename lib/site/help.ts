// The help panel's answers (TL-569), from the API since TL-579: staff edit them in the admin panel, in
// every language. An answer's href ('' for none) can hold [project] or [board], filled in from the page
// you're on (else its fallback); pages are the kinds of page it's suggested on before you type; words
// are extra English search terms.

export const PAGE_KINDS = ['project', 'board', 'dashboard', 'settings', 'account'] as const;
export type PageKind = (typeof PAGE_KINDS)[number];

export type HelpEntry = { slug: string; question: string; answer: string; href: string; fallback_href: string; pages: PageKind[]; words: string };

const PAGES: Record<PageKind, RegExp> = {
  project: /^\/projects\/[^/]+/,
  board: /^\/boards\/[^/]+/,
  dashboard: /^\/dashboard/,
  settings: /^\/settings/,
  account: /^\/account/,
};

// normalise: lower case, no accents, so "Overzicht" finds "overzicht" and "café" finds "cafe".
const normalise = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

// search: the answers with the most of the query's words, the question's words counting double.
// ponytail: word overlap, no stemming or typos; a fuzzy matcher if people miss answers that exist.
export function search(entries: HelpEntry[], query: string, limit = 5): HelpEntry[] {
  const words = normalise(query).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);
  if (words.length === 0) return [];
  return entries
    .map((e) => {
      const q = normalise(e.question);
      const rest = normalise(`${e.answer} ${e.words}`);
      const score = words.reduce((s, w) => s + (q.includes(w) ? 2 : rest.includes(w) ? 1 : 0), 0);
      return { e, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.e);
}

// suggestions: the answers for the page you're on, before you've typed anything; on a page with none
// of its own (a ticket, My work…), the ones about working on tickets.
export function suggestions(entries: HelpEntry[], pathname: string, limit = 5): HelpEntry[] {
  const here = entries.filter((e) => e.pages.some((p) => PAGES[p]?.test(pathname)));
  return (here.length > 0 ? here : entries.filter((e) => e.pages.length === 0)).slice(0, limit);
}

// hrefFor: the entry's link, with this page's project or board filled in.
export function hrefFor(e: Pick<HelpEntry, 'href' | 'fallback_href'>, pathname: string): string {
  const project = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const board = pathname.match(/^\/boards\/([^/]+)/)?.[1];
  if (e.href.includes('[project]')) return project ? e.href.replace('[project]', project) : (e.fallback_href || '/dashboard');
  if (e.href.includes('[board]')) return board ? e.href.replace('[board]', board) : (e.fallback_href || '/dashboard');
  return e.href;
}

// appRoute: a link staff can give an answer: a path in the app, never another site.
export const appRoute = (href: string) => href === '' || (href.startsWith('/') && !href.startsWith('//') && !href.includes('\\'));

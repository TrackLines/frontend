import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { Board, BoardStyle } from '../api';
import type { EstimateScale } from './estimates';

// The edit board page (TL-470) works on a draft: nothing reaches the backend until Save, which sends
// the settings that changed (PATCH /boards/{id}) and the column layout if it changed
// (PUT /boards/{id}/columns). To do stays first and Done stays last: new tickets go into the first
// column, and a ticket is done when it's in the last.

export type DraftColumn = {
  key: string; // stable for the list, also for new columns (which have no id yet)
  id?: string;
  name: string;
  wip: number | null;
  tickets: number; // in the current sprint: a column with any can't be removed
};
// devComplete (TL-532): the column merged PRs move tickets to, until a release ships them; '' = merging finishes them
// reviewColumn (TL-593): where agents' finished work waits for review; '' = the column before Done
export type Draft = { name: string; style: BoardStyle; scale: EstimateScale; agentReview: boolean; devComplete: string; reviewColumn: string; columns: DraftColumn[] };

export const MAX_COLUMN_NAME = 80; // the backend's columns.maxColumnName

export function draftOf(b: Board): Draft {
  return {
    name: b.name, style: b.style ?? 'sprints', scale: b.estimate_scale ?? 'none', agentReview: !!b.agent_review, devComplete: b.dev_complete_column_id ?? '', reviewColumn: b.review_column_id ?? '',
    columns: (b.columns ?? []).map((c) => ({ key: c.id, id: c.id, name: c.name, wip: c.wip_limit ?? null, tickets: c.tickets.length })),
  };
}

// movable: only the columns between To do and Done move, take a WIP limit, or can be removed.
export const movable = (d: Draft, index: number) => index > 0 && index < d.columns.length - 1;

// devCompleteOptions: the saved columns between To do and Done (a new column has no id to pick yet).
export const devCompleteOptions = (d: Draft) => d.columns.filter((c, i) => c.id && movable(d, i));

// devComplete is the draft's Dev complete column, or '' once that column is removed.
export const devComplete = (d: Draft) => (devCompleteOptions(d).some((c) => c.id === d.devComplete) ? d.devComplete : '');

// reviewColumn is the draft's review column, or '' once that column is removed; it's picked from the
// same columns as Dev complete ('' = the column before Done).
export const reviewColumn = (d: Draft) => (devCompleteOptions(d).some((c) => c.id === d.reviewColumn) ? d.reviewColumn : '');

// reviewKey (TL-673): the column the robot marks in the column list, where agents' finished work waits:
// the picked one, or else the column before Done. '' with agent review off or no column in between.
export function reviewKey(d: Draft): string {
  if (!d.agentReview || d.columns.length < 3) return '';
  const picked = reviewColumn(d);
  return (picked ? d.columns.find((c) => c.id === picked)! : d.columns[d.columns.length - 2]).key;
}

// pickReview makes a saved column between To do and Done the review column; the column before Done is
// the default, so picking it saves '' (and the robot follows whichever column is there).
export function pickReview(d: Draft, key: string): Draft {
  const i = d.columns.findIndex((c) => c.key === key);
  if (!movable(d, i) || !d.columns[i].id) return d;
  return { ...d, reviewColumn: i === d.columns.length - 2 ? '' : d.columns[i].id! };
}

export function addColumn(d: Draft, name: string, key: string): Draft {
  const at = Math.max(d.columns.length - 1, 0); // before Done
  const col: DraftColumn = { key, name: name.trim(), wip: null, tickets: 0 };
  return { ...d, columns: [...d.columns.slice(0, at), col, ...d.columns.slice(at)] };
}

export function removeColumn(d: Draft, key: string): Draft {
  const i = d.columns.findIndex((c) => c.key === key);
  if (!movable(d, i) || d.columns[i].tickets > 0) return d;
  return { ...d, columns: d.columns.filter((c) => c.key !== key) };
}

// moveColumn puts the column at index to, kept between To do and Done.
export function moveColumn(d: Draft, key: string, to: number): Draft {
  const from = d.columns.findIndex((c) => c.key === key);
  if (!movable(d, from)) return d;
  const target = Math.min(Math.max(to, 1), d.columns.length - 2);
  if (target === from) return d;
  const cols = [...d.columns];
  const [col] = cols.splice(from, 1);
  cols.splice(target, 0, col);
  return { ...d, columns: cols };
}

export function changeColumn(d: Draft, key: string, change: Partial<Pick<DraftColumn, 'name' | 'wip'>>): Draft {
  return { ...d, columns: d.columns.map((c) => (c.key === key ? { ...c, ...change } : c)) };
}

// problem is why the draft can't be saved yet, or null.
export function problem(d: Draft, i18n: I18n): string | null {
  if (!d.name.trim()) return i18n._(msg`The board needs a name.`);
  for (const c of d.columns) {
    if (!c.name.trim()) return i18n._(msg`Every column needs a name.`);
    if (c.name.trim().length > MAX_COLUMN_NAME) return i18n._(msg`Column names can be up to ${MAX_COLUMN_NAME} characters.`);
    const name = c.name;
    if (c.wip !== null && (!Number.isInteger(c.wip) || c.wip < 1 || c.wip > 999)) return i18n._(msg`“${name}”: a WIP limit is a whole number from 1 to 999, or none.`);
  }
  return null;
}

// settingsPatch is what PATCH /boards/{id} gets: only what changed, or null when nothing did.
export function settingsPatch(d: Draft, was: Draft): { name?: string; style?: BoardStyle; estimate_scale?: EstimateScale; agent_review?: boolean; dev_complete_column_id?: string; review_column_id?: string } | null {
  const patch = {
    ...(d.name.trim() !== was.name && { name: d.name.trim() }),
    ...(d.style !== was.style && { style: d.style }),
    ...(d.scale !== was.scale && { estimate_scale: d.scale }),
    ...(d.agentReview !== was.agentReview && { agent_review: d.agentReview }),
    ...(devComplete(d) !== was.devComplete && { dev_complete_column_id: devComplete(d) }),
    ...(reviewColumn(d) !== was.reviewColumn && { review_column_id: reviewColumn(d) }),
  };
  return Object.keys(patch).length ? patch : null;
}

// layout is what PUT /boards/{id}/columns gets: every column in order (new ones without an id).
export function layout(d: Draft): { id?: string; name: string; wip_limit: number | null }[] {
  return d.columns.map((c, i) => ({ ...(c.id && { id: c.id }), name: c.name.trim(), wip_limit: movable(d, i) ? c.wip : null }));
}

export const layoutChanged = (d: Draft, was: Draft) => JSON.stringify(layout(d)) !== JSON.stringify(layout(was));
export const dirty = (d: Draft, was: Draft) => settingsPatch(d, was) !== null || layoutChanged(d, was);

import type { I18n } from '@lingui/core';
import { msg, plural } from '@lingui/core/macro';

// Due dates (TL-632): a day, no time. They count down in the viewer's own days: "due in 3 days",
// "due tomorrow", "due today", then "2 days overdue".

export type DueState = 'overdue' | 'today' | 'tomorrow' | 'later';

// localDay: a moment as the viewer's local YYYY-MM-DD.
export const localDay = (at: Date = new Date()) => at.toLocaleDateString('en-CA');

// daysUntil: whole days from today to due (negative once it's past), both YYYY-MM-DD.
export function daysUntil(due: string, today: string): number {
  return Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export function dueState(due: string, today: string): DueState {
  const d = daysUntil(due, today);
  return d < 0 ? 'overdue' : d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'later';
}

// dueText: the countdown, in the viewer's language.
export function dueText(i18n: I18n, due: string, today: string): string {
  const d = daysUntil(due, today);
  if (d < 0) return i18n._(msg`${plural(-d, { one: '# day overdue', other: '# days overdue' })}`);
  if (d === 0) return i18n._(msg`Due today`);
  if (d === 1) return i18n._(msg`Due tomorrow`);
  return i18n._(msg`${plural(d, { one: 'Due in # day', other: 'Due in # days' })}`);
}

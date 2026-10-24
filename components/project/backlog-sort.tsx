'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BacklogPlanned, BacklogSort } from '@/lib/api';

// BacklogSortSelect: the backlog's Sort, also in refinement (TL-581), so the order carries over
// between them. Closed tickets have no manual order: "manual" means most recently closed there.
export function BacklogSortSelect({ sort, onSortChange, closed = false, id = 'backlog-sort' }: {
  sort: BacklogSort; onSortChange: (sort: BacklogSort) => void; closed?: boolean; id?: string;
}) {
  const { t } = useLingui();
  // the labels, so the closed select shows "Newest first", not "newest"
  const labels: Record<BacklogSort, string> = { manual: closed ? t`Recently closed` : t`Manual order`, newest: t`Newest first`, oldest: t`Oldest first` };
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <label htmlFor={id}><Trans>Sort</Trans></label>
      <Select items={labels} value={sort} onValueChange={(value) => value && onSortChange(value as BacklogSort)}>
        <SelectTrigger id={id} size="sm" aria-label={t`Sort backlog by date`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(labels) as BacklogSort[]).map((s) => <SelectItem key={s} value={s}>{labels[s]}</SelectItem>)}
        </SelectContent>
      </Select>
    </span>
  );
}

// PlannedSelect: whether the backlog shows tickets already planned into an upcoming sprint (TL-584).
// Unplanned by default: planned ones are on their board's Next sprints.
export function PlannedSelect({ planned, onPlannedChange }: { planned: BacklogPlanned; onPlannedChange: (p: BacklogPlanned) => void }) {
  const { t } = useLingui();
  const labels: Record<BacklogPlanned, string> = { exclude: t`Unplanned`, only: t`Planned`, all: t`Planned and unplanned` };
  return (
    <Select items={labels} value={planned} onValueChange={(value) => value && onPlannedChange(value as BacklogPlanned)}>
      <SelectTrigger size="sm" aria-label={t`Show planned tickets`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(labels) as BacklogPlanned[]).map((p) => <SelectItem key={p} value={p}>{labels[p]}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

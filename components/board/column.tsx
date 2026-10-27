'use client';

import { Plural, Trans, useLingui } from '@lingui/react/macro';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import type { Column as BoardColumn } from '@/lib/api';
import { points, type EstimateScale } from '@/lib/board/estimates';

type ColumnProps = {
  column: BoardColumn;
  note?: ReactNode; // under the header, e.g. kanban's hidden Done tickets
  scale?: EstimateScale; // the board's: with one, the header also shows the column's points
  done?: boolean; // the board's last column: its points are completed, the others' still to do
  limited?: boolean; // takes a WIP limit: the columns between the first (waiting) and the last (Done)
  children?: ReactNode;
};

export function Column({ column, note, scale = 'none', done = false, limited = true, children }: ColumnProps) {
  const { t } = useLingui();
  const limit = limited ? column.wip_limit ?? null : null; // one left on To do or Done (from before) means nothing
  const count = column.tickets.length;
  const over = limit !== null && count > limit;
  const total = column.tickets.reduce((sum, tk) => sum + points(tk.estimate), 0);

  return (
    <section
      aria-label={t`${column.name} column`} data-column-id={column.id} data-column-name={column.name}
      className={`flex min-h-48 min-w-0 w-full flex-col gap-3 rounded-xl bg-muted/50 p-3 ${over ? 'ring-2 ring-destructive/50' : ''}`}
    >
      <header className="flex min-h-8 items-center justify-between gap-2">
        <h2 className="font-semibold">{column.name}</h2>
        <div className="flex items-center gap-1.5">
          {scale !== 'none' && (
            <Badge variant="outline" title={done ? t`Points completed` : t`Points left to do`}>
              {done ? <Plural value={total} one="# pt done" other="# pts done" /> : <Plural value={total} one="# pt left" other="# pts left" />}
            </Badge>
          )}
          <Badge variant={over ? 'destructive' : 'secondary'} title={limit === null ? t`Tickets` : t`Tickets / work-in-progress limit`}>
            {count}{limit !== null && ` / ${limit}`}
          </Badge>
        </div>
      </header>
      {over && <p role="status" className="text-xs text-destructive"><Trans>Over the limit of {limit}: finish something before starting more.</Trans></p>}
      {note}
      <div className="grid content-start gap-3">{children}</div>
    </section>
  );
}

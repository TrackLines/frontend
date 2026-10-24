'use client';

import { useLingui } from '@lingui/react/macro';
import { Badge } from '@/components/ui/badge';

// PlannedBadge: "Sprint 6 · Backend" on a backlog ticket planned into an upcoming sprint (TL-582);
// nothing when it isn't planned.
export function PlannedBadge({ ticket }: { ticket: { planned_sprint_number?: number | null; planned_board_name?: string | null } }) {
  const { t } = useLingui();
  const n = ticket.planned_sprint_number;
  if (n == null) return null;
  const board = ticket.planned_board_name;
  return (
    <Badge variant="outline" title={board ? t`Planned into sprint ${n} on ${board}` : t`Planned into sprint ${n}`}>
      {board ? t`Sprint ${n} · ${board}` : t`Sprint ${n}`}
    </Badge>
  );
}

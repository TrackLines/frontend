import type { Column } from '@/lib/api';

// columnOf returns the column holding ticket id, or the column whose id it is.
export function columnOf(columns: Column[], id: string): Column | undefined {
  return columns.find((c) => c.id === id || c.tickets.some((t) => t.id === id));
}

// moveTicket moves ticket activeId onto overId — another ticket (takes its place) or a column
// (goes to the bottom). Works within and across columns; returns the same array for no-ops.
export function moveTicket(columns: Column[], activeId: string, overId: string): Column[] {
  if (activeId === overId) return columns;
  const from = columnOf(columns, activeId);
  const to = columnOf(columns, overId);
  if (!from || !to) return columns;
  const ticket = from.tickets.find((t) => t.id === activeId)!;
  const overIsColumn = to.id === overId;
  const target = overIsColumn ? to.tickets.length : to.tickets.findIndex((t) => t.id === overId);
  if (from.id === to.id && overIsColumn) return columns; // dropped on its own column's background
  return columns.map((c) => {
    let ts = c.tickets;
    if (c.id === from.id) ts = ts.filter((t) => t.id !== activeId);
    if (c.id === to.id) ts = [...ts.slice(0, target), { ...ticket, column_id: to.id }, ...ts.slice(target)];
    return ts === c.tickets ? c : { ...c, tickets: ts };
  });
}

// placement is where a ticket ended up: what the move API needs.
export function placement(columns: Column[], id: string): { columnId: string; position: number } | null {
  for (const c of columns) {
    const i = c.tickets.findIndex((t) => t.id === id);
    if (i >= 0) return { columnId: c.id, position: i };
  }
  return null;
}

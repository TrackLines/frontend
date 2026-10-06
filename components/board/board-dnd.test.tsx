import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Column } from '@/lib/api';
import { BoardDnd, DroppableColumn, SortableTicket } from './board-dnd';

test('cards are focusable drag handles with a stable aria description', () => {
  const cols: Column[] = [{ id: 'c', name: 'To do', position: 0, tickets: [{ id: 't1', column_id: 'c', title: 'x', description: '', position: 0, created_by: 'test' }] }];
  const html = renderToStaticMarkup(
    <BoardDnd boardId="b" columns={cols} onChange={() => {}} onMove={async () => {}}>
      <DroppableColumn id="c" ticketIds={['t1']}>
        <SortableTicket id="t1"><button>Edit ticket</button></SortableTicket>
      </DroppableColumn>
    </BoardDnd>,
  );
  expect(html).toContain('role="button"');
  expect(html).toContain('tabindex="0"');
  expect(html).toContain('aria-roledescription="sortable"');
  expect(html).toContain('aria-describedby="board-b"'); // stable, id-based (no hydration mismatch)
  expect(html).toContain('>Edit ticket</button>');
});

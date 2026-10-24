import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { ChecklistCount } from './checklist-count';
import { mockDialog } from '@/test/mock-dialog';

test('the checklist count: done of total, green when all done, nothing without a checklist', () => {
  const some = renderToStaticMarkup(<ChecklistCount markdown={'- [x] a\n- [ ] b\n- [ ] c'} />);
  expect(some).toContain('aria-label="Checklist: 1 of 3 done"');
  expect(some).toContain('1/3');
  expect(some).toContain('text-muted-foreground');
  expect(renderToStaticMarkup(<ChecklistCount markdown={'- [x] a'} />)).toContain('text-emerald-700');
  expect(renderToStaticMarkup(<ChecklistCount markdown="no list" />)).toBe('');
});

test('the ticket modal shows the count, and its boxes can be ticked only when the ticket can be changed', async () => {
  mockDialog();
  const { TicketView } = await import('@/components/board/ticket-view');
  const ticket = { id: 't', key: 'TL-1', column_id: 'c', position: 0, title: 'Launch', description: '- [x] keys\n- [ ] backups', created_by: 'Sam' };
  const view = (onDescription?: (next: string) => void) =>
    renderToStaticMarkup(<TicketView open onOpenChange={() => {}} ticket={ticket} columnName="To do" onDescription={onDescription} />);
  expect(view()).toContain('1/2');
  expect(view().match(/type="checkbox"[^>]*disabled=""/g)?.length).toBe(2);
  expect(view(() => {})).not.toMatch(/type="checkbox"[^>]*disabled=""/);
});

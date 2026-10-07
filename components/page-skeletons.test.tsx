import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { BoardSkeleton, ListSkeleton, ProjectSkeleton, TicketSkeleton } from './page-skeletons';

test('skeletons announce loading to screen readers and hide the shapes', () => {
  for (const [el, label] of [[<BoardSkeleton />, 'Loading board…'], [<TicketSkeleton />, 'Loading ticket…'], [<ProjectSkeleton />, 'Loading project…'], [<ListSkeleton />, 'Loading…']] as const) {
    const html = renderToStaticMarkup(el);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(`<span class="sr-only">${label}</span>`);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('animate-pulse');
  }
});

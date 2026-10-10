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

test('list and form page skeletons announce themselves and draw the page shape', async () => {
  const { ListPageSkeleton, FormPageSkeleton } = await import('./page-skeletons');
  const list = renderToStaticMarkup(<ListPageSkeleton label="Loading API keys…" sections={2} action />);
  expect(list).toContain('Loading API keys…');
  expect(list).toContain('aria-busy="true"');
  expect(list.match(/divide-y rounded-xl border/g)?.length).toBe(2);
  expect(renderToStaticMarkup(<FormPageSkeleton label="Loading roadmap…" />)).toContain('Loading roadmap…');
});

import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { Column } from './column';

const ticket = (id: string) => ({ id, column_id: 'c', title: id, description: '', position: 0, created_by: 'u' });
const col = (n: number, wip_limit: number | null) => ({ id: 'c', name: 'Doing', position: 1, wip_limit, tickets: Array.from({ length: n }, (_, i) => ticket(`t${i}`)) });

test('column shows its count against the WIP limit', () => {
  const html = renderToStaticMarkup(<Column column={col(2, 3)} />);
  expect(html).toContain('2 / 3');
  expect(html).not.toContain('Over the limit');
});

test('over the limit is flagged', () => {
  const html = renderToStaticMarkup(<Column column={col(4, 3)} />);
  expect(html).toContain('Over the limit of 3');
  expect(html).toContain('ring-destructive');
});

test('no limit: just the count; the board has no WIP field (that is on the edit page, TL-470)', () => {
  const html = renderToStaticMarkup(<Column column={col(1, null)} />);
  expect(html).not.toContain('WIP limit');
  expect(html).not.toContain(' / ');
});

test('on an estimated board the header shows points: left to do, or completed in Done', () => {
  const sized = { ...col(3, null), tickets: [{ ...ticket('a'), estimate: '5' }, { ...ticket('b'), estimate: '3' }, ticket('c')] };
  expect(renderToStaticMarkup(<Column column={sized} scale="fibonacci" />)).toContain('8 pts left');
  expect(renderToStaticMarkup(<Column column={sized} scale="fibonacci" done />)).toContain('8 pts done');
  expect(renderToStaticMarkup(<Column column={sized} />)).not.toContain('pts'); // no scale: count only
  const shirts = { ...col(2, null), tickets: [{ ...ticket('a'), estimate: 'M' }, { ...ticket('b'), estimate: 'XS' }] };
  expect(renderToStaticMarkup(<Column column={shirts} scale="tshirt" />)).toContain('4 pts left'); // M=3 + XS=1
});

test('WIP limits are only for work in progress: not the first column (waiting) or the last (Done)', async () => {
  const page = await Bun.file(new URL('../../app/boards/[id]/page.tsx', import.meta.url)).text();
  expect(page).toContain('limited={!done && col.id !== cols[0]?.id}');
  // and a limit saved there before is ignored: no "/ 3", no warning
  const html = renderToStaticMarkup(<Column column={col(4, 3)} limited={false} />);
  expect(html).not.toContain('/ 3');
  expect(html).not.toContain('Over the limit');
  expect(html).not.toContain('ring-2 ring-destructive/50'); // the over-limit outline
});

// TL-689: very wide screens show up to five columns (18rem each), not three and a bit; others are unchanged
test('the board page widens to 100rem on very wide screens (source)', async () => {
  const page = await Bun.file(new URL('../../app/boards/[id]/page.tsx', import.meta.url)).text();
  expect(page).toContain("const BOARD_WIDTH = 'max-w-6xl min-[1700px]:max-w-[100rem]';");
  expect(page).toContain('<main className={`mx-auto flex min-h-screen w-full flex-col ${BOARD_WIDTH}`}>');
  expect(page).toContain('<div key={col.id} className="min-w-72 flex-1">'); // 5 × 18rem + gaps + padding fit in 100rem
  const skeleton = await Bun.file(new URL('../layout/page-skeletons.tsx', import.meta.url)).text();
  expect(skeleton).toContain('min-[1700px]:max-w-[100rem]'); // the loading board is as wide as the board
});

// TL-695: on a phone the board header is name, then one sideways-scrolling row of filters; Copy link and
// Edit board are in the "⋯" menu (wider screens keep them as buttons)
test('the board header on phones: filters scroll in one row, rarer actions in a menu (source)', async () => {
  const page = await Bun.file(new URL('../../app/boards/[id]/page.tsx', import.meta.url)).text();
  expect(page).toContain('max-md:w-full max-md:overflow-x-auto');
  expect(page).toContain('className="max-md:hidden" />'); // CopyLink: wider screens
  expect(page).toContain("className: 'max-md:hidden' })}><Trans>Edit board</Trans>");
  expect(page).toContain('<BoardMenu boardId={board.id} token={token} canEdit={!!boardCanManage && !archived && !joinedStandup} />');
  expect(page).toContain('aria-label={t`More board actions`}');
  expect(page).toContain("copyLink(`/boards/${boardId}`, token, t`A board on TrackLin.es`)"); // the same copy as the button
});

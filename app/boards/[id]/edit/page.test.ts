import { expect, test } from 'bun:test';

// TL-803: behind flags.gg "grouped-edit-pages", Edit board is three panels: Settings (tabs), Columns, More
test('grouped Edit board: one Settings panel with the current sprint in it, Columns and More on their own', async () => {
  const page = await Bun.file(new URL('./page.tsx', import.meta.url)).text();
  expect(page).toContain("is('grouped-edit-pages').enabled()");
  const settings = page.slice(page.indexOf('title={t`Settings`}'), page.indexOf('title={t`Columns`}'));
  for (const tab of ['name', 'style', 'ending', 'estimates', 'review', 'release', 'sprint']) expect(settings).toContain(`id: '${tab}'`);
  expect(page).toContain('title={t`More`}');
  expect(page).toContain('aria-labelledby="columns"'); // flag off: the old sections stay
});

test('a board picks its flags.gg agent while flags.gg is connected, saved through its own call (TL-805)', async () => {
  const page = await Bun.file(new URL('./page.tsx', import.meta.url)).text();
  expect(page).toContain('const flagsField = flagsOn && (');
  expect(page).toContain("id: 'flags'");
  expect(page).toContain('if (draft.flagsAgent !== was.flagsAgent) await flags.setBoard(board.id, draft.flagsAgent, token!);');
});

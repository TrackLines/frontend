import { expect, test } from 'bun:test';

// TL-427: only org admins rename a project (the API refuses anyone else), so only they get the control
test('the project name is editable by org admins only', async () => {
  const page = await Bun.file(new URL('./page.tsx', import.meta.url)).text();
  expect(page).toMatch(/label="project"\s+editable=\{admin\}/);
  expect(page).toContain('Only organization admins can rename it.');
});

// TL-803: behind flags.gg "grouped-edit-pages", General / Boards & sharing / Integrations
test('grouped Edit project: General and Boards & sharing tabs, Integrations as it was', async () => {
  const page = await Bun.file(new URL('./page.tsx', import.meta.url)).text();
  expect(page).toContain("is('grouped-edit-pages').enabled()");
  const general = page.slice(page.indexOf('title={t`General`}'), page.indexOf('title={t`Boards & sharing`}'));
  for (const tab of ['name', 'keys', 'week']) expect(general).toContain(`id: '${tab}'`);
  const sharing = page.slice(page.indexOf('title={t`Boards & sharing`}'), page.indexOf('{integrations}'));
  for (const tab of ['boards', 'request', 'embedding', 'export']) expect(sharing).toContain(`id: '${tab}'`);
  expect(page).toContain('title={t`External`}'); // flag off: the old cards stay
});

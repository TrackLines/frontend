import { expect, test } from 'bun:test';

// TL-427: only org admins rename a project (the API refuses anyone else), so only they get the control
test('the project name is editable by org admins only', async () => {
  const page = await Bun.file(new URL('./page.tsx', import.meta.url)).text();
  expect(page).toMatch(/label="project"\s+editable=\{admin\}/);
  expect(page).toContain('Only organization admins can rename it.');
});

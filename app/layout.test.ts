import { expect, test } from 'bun:test';

// Clerk's organizationMembership.created webhook completes invitations (TL-518), so the layout no
// longer asks /api/invitations on every page load (TL-519)
test('the root layout doesn’t check invitations', async () => {
  const src = await Bun.file(new URL('./layout.tsx', import.meta.url)).text();
  expect(src).not.toMatch(/invitation/i);
});

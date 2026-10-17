import { expect, test } from 'bun:test';
import { tabFor } from './work-tabs';

test('the project’s Backlog and Epics are tabs, the Backlog open unless a link asks for Epics (TL-385)', async () => {
  expect(tabFor('')).toBe('backlog');
  expect(tabFor('#backlog')).toBe('backlog');
  expect(tabFor('#epics')).toBe('epics');
  const src = await Bun.file(new URL('./work-tabs.tsx', import.meta.url)).text();
  expect(src).toContain("useState<WorkTab>('backlog')");
  expect(src.indexOf('value="backlog"')).toBeLessThan(src.indexOf('value="epics"')); // Backlog first
  expect(src).toContain('<TabsContent value="backlog" keepMounted>'); // switching back doesn't reload it
});

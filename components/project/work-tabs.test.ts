import { expect, test } from 'bun:test';
import { tabFor } from './work-tabs';

test('the project’s Backlog and Epics are tabs, the Backlog open unless a link asks for Epics (TL-385)', async () => {
  expect(tabFor('')).toBe('backlog');
  expect(tabFor('#backlog')).toBe('backlog');
  expect(tabFor('#epics')).toBe('epics');
  expect(tabFor('#roadmaps')).toBe('roadmaps');
  const src = await Bun.file(new URL('./work-tabs.tsx', import.meta.url)).text();
  expect(src).toContain("useState<WorkTab>('backlog')");
  expect(src.indexOf('value="backlog"')).toBeLessThan(src.indexOf('value="epics"')); // Backlog first
  expect(src.indexOf('value="epics"')).toBeLessThan(src.indexOf('value="roadmaps"')); // then Epics, Roadmaps
  expect(await Bun.file(new URL('../../app/projects/[id]/page.tsx', import.meta.url)).text()).toContain('<WorkTabs projectId={project.id} boards={boardList} token={token} roadmaps={');
  // every panel stays mounted: opening a tab never refetches it or shows it blank first (TL-395)
  const panels = src.match(/<TabsContent [^>]*>/g) ?? [];
  expect(panels).toHaveLength(3);
  for (const p of panels) expect(p).toContain('keepMounted');
});

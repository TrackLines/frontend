import { expect, test } from 'bun:test';
import { scopeFor } from './quick-add-ticket';

test('where the header New ticket lands', () => {
  expect(scopeFor('/dashboard')).toEqual({ kind: 'pick' });
  expect(scopeFor('/projects/p1')).toEqual({ kind: 'project', id: 'p1' });
  expect(scopeFor('/boards/b1')).toEqual({ kind: 'board', id: 'b1' });
  for (const p of ['/', '/settings', '/r/x', '/roadmaps/x/edit', '/projects/p1/extra']) expect(scopeFor(p)).toBeNull();
});

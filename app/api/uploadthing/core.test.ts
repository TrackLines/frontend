import { expect, test } from 'bun:test';
import { targetPath, uploadTarget } from './core';

const id = '01234567-89ab-4cde-8f01-23456789abcd';

test('uploads need a ticket (or, while creating one, a project) the uploader can see', () => {
  expect(targetPath({ ticketId: id })).toBe(`/api/tickets/${id}`);
  expect(targetPath({ projectId: id })).toBe(`/api/projects/${id}`);
  expect(uploadTarget.safeParse({ ticketId: id }).success).toBe(true);
  // no target, or anything that isn't an id (e.g. a path trick), is refused before any upload
  for (const bad of [{}, { ticketId: '../keys' }, { projectId: 'x' }, { boardId: id }]) expect(uploadTarget.safeParse(bad).success).toBe(false);
});

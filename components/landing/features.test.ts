import { expect, test } from 'bun:test';
import { FEATURES } from './features';

test('the homepage highlights following the host live in standup and refinement', () => {
  const card = FEATURES.find((f) => f.title === 'Standup and refinement, no screen sharing');
  expect(card?.body).toContain('everyone follows along live on their own screen');
});

test('the blockers card says which ticket waits: the one depending on unfinished work', () => {
  const card = FEATURES.find((f) => f.title === 'Blocked tickets wait their turn');
  expect(card?.body).toContain('When a ticket depends on another that isn’t finished, nobody can pick it up');
  expect(card?.body).toContain('The work it’s waiting on carries on as normal.');
});

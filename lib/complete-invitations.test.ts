import { expect, test } from 'bun:test';
import type { Invitation } from './api';
import { ApiError } from './api';
import { completeInvitations } from './complete-invitations';

const invite = (id: string) => ({ id, scope: 'organization', status: 'pending' }) as Invitation;

test('invitations accepted in Clerk are completed without a second press; the rest wait (TL-240)', async () => {
  const tried: string[] = [];
  const done = await completeInvitations([invite('a'), invite('b'), invite('c')], async (id) => {
    tried.push(id);
    if (id === 'b') throw new ApiError(409, 'accept the organization invitation through Clerk before completing this invitation');
  });
  expect(tried).toEqual(['a', 'b', 'c']); // one refusal doesn't stop the others
  expect(done).toEqual(['a', 'c']);
});

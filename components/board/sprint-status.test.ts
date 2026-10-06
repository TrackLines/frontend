import { expect, test } from 'bun:test';
import { sprintStatus } from './sprint-status';

const now = new Date('2026-10-06T09:00:00Z');

test('days remaining', () => {
  expect(sprintStatus('2026-10-13T09:00:00Z', now)).toEqual({ overdue: false, label: 'ends in 7 days' });
  expect(sprintStatus('2026-10-07T10:00:00Z', now)).toEqual({ overdue: false, label: 'ends in 2 days' });
  expect(sprintStatus('2026-10-07T08:00:00Z', now).label).toBe('ends in 1 day');
});

test('overdue', () => {
  expect(sprintStatus('2026-10-06T08:59:00Z', now)).toEqual({ overdue: true, label: 'overdue — closes automatically' });
  expect(sprintStatus('2026-10-04T08:00:00Z', now)).toEqual({ overdue: true, label: 'overdue by 2 days' });
});

import { afterEach, expect, test } from 'bun:test';
import { onboarding, type OnboardingState } from '@/lib/api';
import { boardDestination, finishedGuide, GUIDE, mergeGuideStatus, needsSetup, offerGuide } from './onboarding';

const state: OnboardingState = { admin: true, step: 'complete', project_id: 'project', board_id: 'board', completed_at: '2026-10-27T00:00:00Z', guide: { ...GUIDE, available: true } };
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

test('a late pre-completion status response cannot bring the guide back, while a new published version can', () => {
  const saved = { ...state, guide: { ...state.guide, available: false } };
  expect(mergeGuideStatus(saved, state).guide.available).toBe(false);
  expect(mergeGuideStatus(saved, { ...state, guide: { ...state.guide, version: GUIDE.version+1 } }).guide.available).toBe(true);
  expect(mergeGuideStatus(null, state)).toBe(state);
});

test('setup resumes only for admins and ends independently of guide completion', () => {
  expect(needsSetup({ ...state, step: 'project' })).toBe(true);
  expect(needsSetup({ ...state, step: 'invite' })).toBe(true);
  expect(needsSetup(state)).toBe(false);
  expect(needsSetup({ ...state, admin: false, step: 'project' })).toBe(false);
  expect(offerGuide({ ...state, step: 'invite' })).toBe(false);
  expect(offerGuide({ ...state, admin: false })).toBe(false);
  expect(offerGuide(state)).toBe(true);
});

test('only matching, uncompleted published versions expose the guide button', () => {
  expect(offerGuide({ ...state, guide: { ...GUIDE, available: false } })).toBe(false);
  expect(offerGuide({ ...state, guide: { ...GUIDE, version: GUIDE.version+1, available: true } })).toBe(false);
  expect(offerGuide({ ...state, guide: { ...GUIDE, id: 'unshipped-guide', available: true } })).toBe(false);
  expect(offerGuide(state)).toBe(true);
});

test('only a finished Joyride tour counts, never dismissal or skip', () => {
  expect(finishedGuide({ type: 'tour:end', status: 'finished' })).toBe(true);
  expect(finishedGuide({ type: 'tour:end', status: 'skipped' })).toBe(false);
  expect(finishedGuide({ type: 'tour:status', status: 'finished' })).toBe(false);
  expect(finishedGuide({ type: 'tour:end', status: 'paused' })).toBe(false);
  expect(boardDestination(state)).toBe('/boards/board');
  expect(boardDestination({ ...state, board_id: null })).toBe('/dashboard');
});

test('setup/import adoption and guide completion send the documented independent API requests', async () => {
  const requests: { path: string; method: string; body: unknown; auth: string | null }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    requests.push({ path: new URL(url).pathname, method: init.method ?? 'GET', body: init.body ? JSON.parse(String(init.body)) : null, auth: new Headers(init.headers).get('Authorization') });
    return Response.json(state);
  }) as typeof fetch;
  await onboarding.setup({ name: 'Website', key_prefix: 'WEB', template_id: 'builtin:kanban' }, 'token');
  await onboarding.setup({ board_id: 'imported-board' }, 'token');
  await onboarding.finish('token');
  await onboarding.completeGuide(GUIDE, 'token');
  expect(requests.map(({path, method, body}) => ({path, method, body}))).toEqual([
    { path: '/api/onboarding/setup', method: 'POST', body: { name: 'Website', key_prefix: 'WEB', template_id: 'builtin:kanban' } },
    { path: '/api/onboarding/setup', method: 'POST', body: { board_id: 'imported-board' } },
    { path: '/api/onboarding/finish', method: 'POST', body: null },
    { path: '/api/onboarding/guide/complete', method: 'POST', body: GUIDE },
  ]);
  expect(requests.every((r) => r.auth === 'Bearer token')).toBe(true);
});

test('failed completion rejects without hiding the button, persisted completion survives a new status request', async () => {
  globalThis.fetch = (async () => new Response('unavailable', { status: 503 })) as unknown as typeof fetch;
  await expect(onboarding.completeGuide(GUIDE, 'token')).rejects.toThrow();
  expect(offerGuide(state)).toBe(true);
  let saved = state;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    if (init.method === 'POST') saved = { ...saved, guide: { ...saved.guide, available: false } };
    return Response.json(saved);
  }) as typeof fetch;
  expect(offerGuide(await onboarding.completeGuide(GUIDE, 'token'))).toBe(false);
  expect(offerGuide(await onboarding.status('new-session-token'))).toBe(false);
});

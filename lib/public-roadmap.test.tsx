import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiError } from '@/lib/api';
import { ownerOnly, readRoadmap } from './public-roadmap';
import { Locked } from '@/app/r/[id]/locked';

const fail = (status: number) => async () => { throw new ApiError(status, 'nope'); };

test('a shared roadmap link: readable, needs sign-in, or (team-only / missing) looks the same as not there', async () => {
  expect(await readRoadmap(async () => ({ title: 'Q4' }))).toEqual({ roadmap: { title: 'Q4' } });
  expect(await readRoadmap(fail(401))).toBe('locked');
  expect(await readRoadmap(fail(403))).toBe('missing'); // never reveals a private roadmap exists
  expect(await readRoadmap(fail(404))).toBe('missing');
  await expect(readRoadmap(fail(500))).rejects.toThrow();
});

test('the owner gets app navigation; anyone else (or signed out) gets a clean page', async () => {
  expect(await ownerOnly(null, async () => 'project')).toBeNull();
  expect(await ownerOnly('tok', async () => 'project')).toBe('project');
  expect(await ownerOnly('tok', fail(404))).toBeNull();
});

test('the lock sends people to sign in and back to this roadmap', () => {
  const html = renderToStaticMarkup(<Locked id="abc 1" />);
  expect(html).toContain('Sign in to view this roadmap');
  expect(html).toContain('href="/sign-in?redirect_url=%2Fr%2Fabc%201"');
});

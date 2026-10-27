import { describe, expect, test } from 'bun:test';
import { onePassword, reference, type Resolver } from './onepassword';

const fake = (values: Record<string, string>): Resolver & { calls: string[][] } => {
  const calls: string[][] = [];
  const fn = (async (_token: string, refs: string[]) => {
    calls.push(refs);
    return Object.fromEntries(refs.map((r) => [r, r in values ? { secret: values[r] } : { error: 'fieldNotFound' }]));
  }) as Resolver & { calls: string[][] };
  fn.calls = calls;
  return fn;
};

describe('reference', () => {
  test('splits on the last dot', () => {
    expect(reference('tracklines', 'clerk.password')).toBe('op://tracklines/clerk/password');
    expect(reference('tracklines', 'a.b.username')).toBe('op://tracklines/a.b/username');
  });
  test('passes a full reference through', () => {
    expect(reference('tracklines', 'op://other/item/field')).toBe('op://other/item/field');
  });
  test('rejects a key without item and field', () => {
    expect(() => reference('v', 'nodot')).toThrow();
    expect(() => reference('v', 'item.')).toThrow();
  });
});

describe('onePassword', () => {
  test('does nothing without a token', async () => {
    const env: Record<string, string | undefined> = {};
    const r = fake({});
    await onePassword('v', { 'clerk.password': 'CLERK_SECRET_KEY' }, env, r);
    expect(r.calls).toEqual([]);
    expect(env.CLERK_SECRET_KEY).toBeUndefined();
  });

  test('sets missing variables and keeps ones already set', async () => {
    const env: Record<string, string | undefined> = { OP_SERVICE_ACCOUNT_TOKEN: 't', UPLOADTHING_TOKEN: 'local' };
    const r = fake({ 'op://v/clerk/password': 'sk_live' });
    await onePassword('v', { 'clerk.password': 'CLERK_SECRET_KEY', 'uploadthing_frontend.username': 'UPLOADTHING_TOKEN' }, env, r);
    expect(r.calls).toEqual([['op://v/clerk/password']]);
    expect(env.CLERK_SECRET_KEY).toBe('sk_live');
    expect(env.UPLOADTHING_TOKEN).toBe('local');
  });

  test('a failed reference errors with the reference, never a value', async () => {
    const env: Record<string, string | undefined> = { OP_SERVICE_ACCOUNT_TOKEN: 't' };
    const r = fake({ 'op://v/clerk/password': 'sk_live' });
    const err = await onePassword('v', { 'clerk.password': 'CLERK_SECRET_KEY', 'gone.username': 'X' }, env, r).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain('op://v/gone/username');
    expect((err as Error).message).not.toContain('sk_live');
    expect(env.CLERK_SECRET_KEY).toBeUndefined(); // all or nothing
  });
});

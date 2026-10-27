// onePassword loads server secrets from 1Password at boot, like go-config's OnePassword option (TL-515):
// fields maps "<item>.<field>" (or a full op:// reference) in vault to the env var to set. A variable
// that's already set wins (local .env, tests), and with no OP_SERVICE_ACCOUNT_TOKEN it does nothing.

export type Resolver = (token: string, refs: string[]) => Promise<Record<string, { secret?: string; error?: string }>>;

// reference turns "item.field" into op://vault/item/field, splitting on the last dot so item names can hold dots.
export function reference(vault: string, key: string): string {
  if (key.startsWith('op://')) return key;
  const dot = key.lastIndexOf('.');
  if (dot <= 0 || dot === key.length - 1) throw new Error(`onepassword: "${key}" is not <item>.<field>`);
  return `op://${vault}/${key.slice(0, dot)}/${key.slice(dot + 1)}`;
}

// sdkResolver looks every reference up in one call; the SDK (WASM) only loads when there's a token.
const sdkResolver: Resolver = async (token, refs) => {
  const { createClient } = await import('@1password/sdk');
  const client = await createClient({ auth: token, integrationName: 'tracklines-frontend', integrationVersion: '1' });
  const res = await client.secrets.resolveAll(refs);
  return Object.fromEntries(
    Object.entries(res.individualResponses).map(([ref, r]) => [ref, { secret: r.content?.secret, error: r.error?.type }]),
  );
};

export async function onePassword(vault: string, fields: Record<string, string>, env: Record<string, string | undefined> = process.env, resolve: Resolver = sdkResolver) {
  const token = env.OP_SERVICE_ACCOUNT_TOKEN;
  if (!token) return;
  const wanted = Object.entries(fields)
    .filter(([, name]) => !env[name])
    .map(([key, name]) => ({ ref: reference(vault, key), name }));
  if (wanted.length === 0) return;

  const got = await resolve(token, wanted.map((w) => w.ref));
  // never put a value in an error: only the reference and why
  const failed = wanted.filter((w) => got[w.ref]?.secret === undefined).map((w) => `${w.ref} (${got[w.ref]?.error ?? 'missing'})`);
  if (failed.length) throw new Error(`onepassword: unable to resolve ${failed.join(', ')}`);
  for (const w of wanted) env[w.name] = got[w.ref].secret;
}

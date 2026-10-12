// safeRedirect keeps a post-sign-in redirect on this site: a same-origin path only. Anything else
// (another host, //evil.com, /\evil.com which browsers read as //evil.com, javascript:) goes to the dashboard.
export function safeRedirect(value: string | string[] | undefined, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.includes('\\')) return fallback;
  const base = 'https://tracklines.invalid';
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return fallback;
  }
  if (url.origin !== base) return fallback;
  return url.pathname + url.search + url.hash;
}

import { afterEach, expect, test } from 'bun:test';
import { useLingui } from '@lingui/react/macro';
import { render } from '@/test/i18n';
import { SubscribeForm, SubscriptionAction, subscribeError } from './subscribe';
import { ApiError, roadmaps } from '@/lib/api';

const g = globalThis as unknown as { window?: unknown; fetch: typeof fetch };
const realFetch = g.fetch;
afterEach(() => { delete g.window; g.fetch = realFetch; });

test('the subscribe form asks for one email address and says you can unsubscribe (TL-903)', () => {
  const html = render(<SubscribeForm roadmapId="r1" />);
  for (const s of ['Get updates by email', 'type="email"', 'required=""', 'maxLength="254"', 'aria-label="Email address"', 'unsubscribe from any email', 'Subscribe</button>', 'print:hidden']) expect(html).toContain(s);
});

function Failure({ err }: { err: unknown }) {
  const { i18n } = useLingui();
  return <>{i18n._(subscribeError(err))}</>;
}

test('a failed subscribe says what to do about it', () => {
  expect(render(<Failure err={new ApiError(400, 'x', 'invalid_email')} />)).toBe('Enter one email address.');
  expect(render(<Failure err={new ApiError(429, 'rate limit exceeded')} />)).toContain('wait a minute');
  expect(render(<Failure err={new ApiError(502, 'x')} />)).toContain('Couldn’t send the confirmation email');
  expect(render(<Failure err={new Error('network')} />)).toContain('Couldn’t send the confirmation email');
});

test('an email’s link lands on a page that does nothing until its button is pressed', async () => {
  const confirm = render(<SubscriptionAction roadmapId="r1" action="confirm" token="secret-token" />);
  for (const s of ['Confirm your subscription', 'Confirm subscription</button>', 'href="/r/r1"', 'View roadmap']) expect(confirm).toContain(s);
  expect(confirm).not.toContain('Unsubscribe');
  const leave = render(<SubscriptionAction roadmapId="r1" action="unsubscribe" token="secret-token" />);
  for (const s of ['Unsubscribe from this roadmap', 'Unsubscribe</button>', 'href="/r/r1"']) expect(leave).toContain(s);
  for (const html of [confirm, leave]) expect(html).not.toContain('secret-token'); // the token is never put in the page or a link
  // no effect runs the action on load: only the button does (mail scanners open links)
  const source = await Bun.file(new URL('./subscribe.tsx', import.meta.url)).text();
  expect(source).not.toContain('useEffect');
  expect(source).toContain('<Button onClick={run}');
});

test('subscribe, confirm and unsubscribe call the backend without a session (TL-902)', async () => {
  g.window = { Clerk: { session: null } };
  const calls: { url: string; method?: string; body?: string; auth?: string }[] = [];
  g.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method, body: init.body as string, auth: (init.headers as Record<string, string>).Authorization });
    return url.endsWith('/confirm') ? Response.json({ roadmap_id: 'r1' }) : new Response(null, { status: 204 });
  }) as unknown as typeof fetch;
  await roadmaps.subscribe('r1', 'reader@example.test');
  expect(await roadmaps.confirmSubscription('tok')).toEqual({ roadmap_id: 'r1' });
  await roadmaps.unsubscribe('tok');
  expect(calls.map((c) => [c.url.replace(/^.*\/api/, ''), c.method, c.body, c.auth])).toEqual([
    ['/roadmaps/r1/subscriptions', 'POST', '{"email":"reader@example.test"}', undefined],
    ['/roadmap-subscriptions/confirm', 'POST', '{"token":"tok"}', undefined],
    ['/roadmap-subscriptions/unsubscribe', 'POST', '{"token":"tok"}', undefined],
  ]);
});

test('the public roadmap offers the form only when the backend says so; the link page stays private', async () => {
  const page = await Bun.file(new URL('../../app/r/[id]/page.tsx', import.meta.url)).text();
  expect(page).toContain('{r.can_subscribe && <SubscribeForm roadmapId={r.id} />}');
  const landing = await Bun.file(new URL('../../app/r/[id]/subscription/page.tsx', import.meta.url)).text();
  expect(landing).toContain("robots: { index: false, follow: false }, referrer: 'no-referrer'"); // the token is a secret
  expect(landing).toContain('if (!isRoadmapId(id) || (!confirm && !unsubscribe)) notFound();');
});

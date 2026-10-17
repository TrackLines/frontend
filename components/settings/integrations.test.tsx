import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { FeatureFlags } from '@/components/feature-flags';
import { BugfixesTokenForm, IntegrationsSettings, ProviderCardView } from './integrations';

const view = (props: Partial<Parameters<typeof ProviderCardView>[0]>) => renderToStaticMarkup(
  <ProviderCardView provider="github" status={{ provider: 'github', connected: false }} canManage busy={false} error="" onConnect={() => {}} onDisconnect={() => {}} {...props} />,
);

test('not connected: admins get a connect button', () => {
  const html = view({});
  expect(html).toContain('Not connected');
  expect(html).toContain('Connect GitHub');
  expect(html).not.toContain('Disconnect');
});

test('connected: shows the account; admins can disconnect', () => {
  const html = view({ status: { provider: 'github', connected: true, account: 'acme' } });
  expect(html).toContain('Connected as acme');
  expect(html).toContain('Disconnect');
  expect(html).not.toContain('Connect GitHub');
});

test('members see the status only', () => {
  expect(view({ canManage: false })).not.toContain('Connect GitHub');
  expect(view({ canManage: false, status: { provider: 'github', connected: true } })).not.toContain('Disconnect');
});

test('loading and errors (e.g. not configured on the server)', () => {
  expect(view({ status: null })).toContain('Checking…');
  expect(view({ error: 'Integrations aren’t set up on this server yet' })).toContain('role="alert"');
});

test('Bugfixes connects with a token, never shown', () => {
  const html = renderToStaticMarkup(<BugfixesTokenForm busy={false} connected={false} onSave={() => {}} />);
  expect(html).toContain('type="password"');
  expect(html).toContain('viewer-role token');
  expect(renderToStaticMarkup(<BugfixesTokenForm busy={false} connected onSave={() => {}} />)).toContain('Replace access token');
});

test('settings offer GitHub and Bitbucket with no flag (TL-285), under Repositories, open first; Bugfixes and Google Chat have tabs (TL-389)', () => {
  const html = renderToStaticMarkup(<FeatureFlags><IntegrationsSettings token="tok" /></FeatureFlags>);
  for (const name of ['Repositories', 'Communication', 'Reporting', 'GitHub', 'Bitbucket']) expect(html).toContain(name);
  expect(html).not.toContain('aria-label="Bugfixes"'); // its card waits in the Reporting tab
});

test('GitHub: every connected account, each disconnected on its own, and another can be added (TL-281)', () => {
  const accounts = [{ installation_id: '123', account: 'acme' }, { installation_id: '456', account: '1tn-pw' }];
  const seen: (string | undefined)[] = [];
  const html = view({ status: { provider: 'github', connected: true, account: 'acme', accounts }, onDisconnect: (id) => seen.push(id) });
  expect(html).toContain('>acme<');
  expect(html).toContain('>1tn-pw<');
  expect(html.match(/>Disconnect</g)?.length).toBe(2); // one per account, none for all of GitHub
  expect(html).toContain('Add another GitHub account');
  expect(html).not.toContain('Connected as'); // the list says who
  const member = view({ canManage: false, status: { provider: 'github', connected: true, accounts } });
  expect(member).toContain('>1tn-pw<');
  expect(member).not.toContain('Disconnect');
  expect(member).not.toContain('Add another');
});

test('Bitbucket: the workspaces the connected person reaches, whose account it is, one Disconnect (TL-286)', () => {
  const html = view({ provider: 'bitbucket', status: { provider: 'bitbucket', connected: true, account: 'keloran1',
    workspaces: [{ slug: 'chewedfeed', name: 'ChewedFeed' }, { slug: '1tn', name: '1tn' }] } });
  expect(html).toContain('>ChewedFeed<');
  expect(html).toContain('>1tn<');
  expect(html).toContain('keloran1’s Bitbucket account');
  expect(html.match(/>Disconnect</g)?.length).toBe(1);
  expect(view({ provider: 'bitbucket', status: { provider: 'bitbucket', connected: true, account: 'keloran1', workspaces: [] } })).toContain('isn’t in any Bitbucket workspaces');
});

test('integrations are in tabs by what they do, Repositories first, and every provider is in exactly one (TL-389)', async () => {
  const { INTEGRATION_TABS } = await import('./integrations');
  const { INTEGRATION_PROVIDERS } = await import('@/lib/integrations');
  expect(INTEGRATION_TABS.map((t) => t.name)).toEqual(['Repositories', 'Communication', 'Reporting', 'Calendars']);
  expect(INTEGRATION_TABS.find((t) => t.id === 'calendars')).toMatchObject({ items: ['google-calendar'] }); // TL-409: always there now (no flag)
  expect(INTEGRATION_TABS.find((t) => t.id === 'repositories')?.items).toEqual(['github', 'bitbucket']);
  expect(INTEGRATION_TABS.find((t) => t.id === 'communication')?.items).toEqual(['google-chat']);
  expect(INTEGRATION_TABS.find((t) => t.id === 'reporting')?.items).toEqual(['bugfixes']);
  const all = INTEGRATION_TABS.flatMap((t) => t.items);
  for (const p of INTEGRATION_PROVIDERS) expect(all.filter((i) => i === p)).toHaveLength(1);
});

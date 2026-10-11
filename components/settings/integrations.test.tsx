import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { BugfixesTokenForm, ProviderCardView } from './integrations';

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

import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiError, type CalendarStatus } from '@/lib/api';
import { calendarError, DELEGATION_URL, GoogleCalendarView, UK_HOLIDAYS } from './google-calendar';
import { IntegrationsSettings } from './integrations';
import { FeatureFlags } from '@/components/feature-flags';

const noop = () => {};
const view = (status: CalendarStatus | null, canManage = true, extra: Partial<Parameters<typeof GoogleCalendarView>[0]> = {}) =>
  renderToStaticMarkup(<GoogleCalendarView status={status} canManage={canManage} busy={null} message="" error="" onConnect={noop} onTest={noop} onSync={noop} onRemove={noop} {...extra} />);

const notConnected: CalendarStatus = { available: true, connected: false, client_id: '1234567890', scope: 'https://www.googleapis.com/auth/calendar.readonly' };
const connected: CalendarStatus = { ...notConnected, connected: true, connection: { domain: 'acme.test', admin_email: 'boss@acme.test', holidays_calendar: UK_HOLIDAYS, connected_at: '2026-10-17T10:00:00Z', last_sync_at: '2026-10-17T11:00:00Z', last_sync_error: '' } };

test('admins get the steps: what to paste into Google, with copy buttons, then the Workspace (TL-409)', () => {
  const html = view(notConnected);
  for (const s of [`href="${DELEGATION_URL}"`, 'Access and data control → API controls → Manage Domain Wide Delegation', 'super admin', '1234567890', 'auth/calendar.readonly', 'aria-label="Copy Client ID"', 'aria-label="Copy OAuth scopes"', 'Workspace domain', 'Admin email', 'Company days off', 'UK bank holidays', '>Connect<', 'Not connected']) {
    expect(html).toContain(s);
  }
  expect(html).toContain('Only the dates are kept');
});

test('members see whether it’s connected, never the form or the controls', () => {
  expect(view(notConnected, false)).toContain('An organization admin can connect');
  expect(view(notConnected, false)).not.toContain('Workspace domain');
  const html = view(connected, false);
  expect(html).toContain('Connected to acme.test');
  for (const s of ['Sync now', 'Test connection', 'Disconnect']) expect(html).not.toContain(s);
});

test('connected: when it last synced, company days off, the last error, and the admin controls', () => {
  const html = view(connected);
  for (const s of ['Connected to acme.test', 'Last synced', 'dateTime="2026-10-17T11:00:00Z"', UK_HOLIDAYS, 'Sync now', 'Test connection', 'Disconnect']) expect(html).toContain(s);
  const failing = view({ ...connected, connection: { ...connected.connection!, last_sync_error: 'Google hasn’t allowed TrackLin.es to read calendars yet.' } });
  expect(failing).toContain('role="alert"');
  expect(failing).toContain('allowed TrackLin.es');
  expect(view({ ...connected, connection: { ...connected.connection!, last_sync_at: null } })).toContain('not yet');
});

test('no service account: admins are told; checking; busy', () => {
  expect(view({ ...notConnected, available: false })).toContain('isn’t set up on this server');
  expect(view({ ...notConnected, available: false }, false)).not.toContain('set up on this server');
  expect(view(null)).toContain('Checking…');
  expect(view(notConnected, true, { busy: 'connect' })).toContain('Checking with Google…');
});

test('Google’s reasons come through in words; other failures fall back', () => {
  expect(calendarError(new ApiError(400, 'Google doesn’t know that user.'), 'x')).toBe('Google doesn’t know that user.');
  expect(calendarError(new ApiError(403, 'forbidden'), 'x')).toBe('Only organization admins can change this.');
  expect(calendarError(new Error('boom'), 'Couldn’t connect.')).toBe('Couldn’t connect.');
});

test('the Calendars tab is hidden while the flag is off', () => {
  // no flags.gg project configured (as in tests): every flag is off
  expect(renderToStaticMarkup(<FeatureFlags><IntegrationsSettings token="tok" /></FeatureFlags>)).not.toContain('Calendars');
});

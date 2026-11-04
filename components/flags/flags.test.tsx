import { expect, test } from 'bun:test';
const { render } = await import('@/test/i18n');
const { FlagsSettingsView, NeedsFlagField, ProjectFlagsView, TicketFlagView, flagError } = await import('./flags');
const { FlagActionSelect } = await import('@/components/board/column-list');
const { ApiError } = await import('@/lib/api');
const { i18nFor } = await import('@/lib/i18n');
import type { FlagsStatus, TicketFlag } from '@/lib/api';

const clean = (s: string) => s.replace(/<!-- -->/g, '');
const agents: FlagsStatus['agents'] = [{ project_id: 'fp', project_name: 'Web', agent_id: 'agent-web', agent_name: 'backend',
  environments: [{ environment_id: 'dev', name: 'dev', level: 0 }, { environment_id: 'prod', name: 'prod', level: 1, production: true }] }];
const noop = () => {};

test('org settings: admins connect with a token; everyone sees the applications it reaches (TL-790)', () => {
  const off = clean(render(<FlagsSettingsView status={{ provider: 'flags', connected: false }} canManage busy={false} error="" onConnect={noop} onDisconnect={noop} />));
  expect(off).toContain('Not connected');
  expect(off).toContain('Integration token');
  expect(off).not.toContain('>Disconnect<');
  const on = clean(render(<FlagsSettingsView status={{ provider: 'flags', connected: true, agents }} canManage={false} busy={false} error="" onConnect={noop} onDisconnect={noop} />));
  expect(on).toContain('Connected');
  expect(on).toContain('Web · backend');
  expect(on).toContain('dev → prod');
  expect(on).not.toContain('Integration token'); // members can't change it
});

test('project settings: pick the application, cleanup days; asks to connect first', () => {
  expect(clean(render(<ProjectFlagsView status={{ provider: 'flags', connected: false }} settings={{ agent_id: null, cleanup_days: 30 }} canManage busy={false} note={null} onSave={noop} />)))
    .toContain('Connect flags.gg under Settings → Integrations first');
  const html = clean(render(<ProjectFlagsView status={{ provider: 'flags', connected: true, agents }} settings={{ agent_id: 'agent-web', cleanup_days: 14 }} canManage busy={false} note={null} onSave={noop} />));
  expect(html).toContain('Application');
  expect(html).toContain('value="14"');
  expect(html).toContain('>Save<');
});

test('a ticket can need a flag; its name locks once flags.gg has it (TL-791)', () => {
  expect(clean(render(<NeedsFlagField needs={false} name="" placeholder="tl-1" locked={false} onNeeds={noop} onName={noop} />))).not.toContain('Flag name');
  const open = clean(render(<NeedsFlagField needs name="" placeholder="tl-1" locked={false} onNeeds={noop} onName={noop} />));
  expect(open).toContain('Flag name');
  expect(open).toContain('placeholder="tl-1"');
  expect(clean(render(<NeedsFlagField needs name="tl-1" placeholder="tl-1" locked onNeeds={noop} onName={noop} />))).toContain('its name can’t change');
});

test('the flag panel: a switch where it has arrived, “Not yet” elsewhere, and Remove flag', () => {
  const flag: TicketFlag = { ticket: 'TL-1', name: 'tl-1', agent_id: 'a', environments: [
    { environment_id: 'dev', name: 'dev', level: 0, present: true, enabled: true },
    { environment_id: 'prod', name: 'prod', level: 1, present: false, enabled: false, production: true }] };
  const html = clean(render(<TicketFlagView name="tl-1" flag={flag} problem="" error="" busy={false} onToggle={noop} onRemove={noop} />));
  expect(html).toContain('>tl-1<');
  expect(html).toContain('aria-label="On in dev"');
  expect(html).toContain('Not yet');
  expect(html).toContain('Remove flag');
  const waiting = clean(render(<TicketFlagView name="tl-1" flag="none" problem="a flag with that name already exists" error="" busy={false} onToggle={noop} onRemove={noop} />));
  expect(waiting).toContain('when this ticket goes onto a board');
  expect(waiting).toContain('role="alert"');
  expect(waiting).not.toContain('Remove flag');
});

test('a column’s flag action says what automatic means for it (TL-790)', () => {
  const html = clean(render(<FlagActionSelect column={{ key: 'c', id: 'c', name: 'Testing', wip: null, tickets: 0, flag: '', autoFlag: 'promote' }} onChange={noop} />));
  expect(html).toContain('Automatic: Promote to the next environment');
});

test('errors say what to do', () => {
  const i18n = i18nFor('en');
  expect(flagError(i18n, new ApiError(403, 'x'), 'f')).toContain('Only organization admins');
  expect(flagError(i18n, new ApiError(409, 'a flag with that name already exists'), 'f')).toBe('a flag with that name already exists');
  expect(flagError(i18n, new Error('offline'), 'fallback')).toBe('fallback');
});

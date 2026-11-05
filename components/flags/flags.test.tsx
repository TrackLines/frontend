import { expect, test } from 'bun:test';
const { render } = await import('@/test/i18n');
const { FlagSpecialiseEditor, FlagsSettingsView, NeedsFlagField, ProjectFlagsView, TicketFlagView, flagError, isGeneric, specialSummary, splitValues, toRules } = await import('./flags');
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
  const html = clean(render(<TicketFlagView name="tl-1" flag={flag} problem="" error="" busy={false} onChange={noop} onRemove={noop} />));
  expect(html).toContain('>tl-1<');
  expect(html).toContain('aria-label="On in dev"');
  expect(html).toContain('Not yet');
  expect(html).toContain('Remove flag');
  const waiting = clean(render(<TicketFlagView name="tl-1" flag="none" problem="a flag with that name already exists" error="" busy={false} onChange={noop} onRemove={noop} />));
  expect(waiting).toContain('when this ticket goes onto a board');
  expect(waiting).toContain('role="alert"');
  expect(waiting).not.toContain('Remove flag');
});

test('a generic flag is plain on/off; a specialised one says how (TL-822)', () => {
  const flag: TicketFlag = { ticket: 'TL-1', name: 'tl-1', agent_id: 'a', environments: [
    { environment_id: 'dev', name: 'dev', level: 0, present: true, enabled: true, rollout: 100, rules: [] },
    { environment_id: 'stg', name: 'staging', level: 1, present: true, enabled: true, rollout: 25, rules: [{ attribute: 'key', operator: 'in', values: ['u_8812'], serve: true }] },
    { environment_id: 'prod', name: 'prod', level: 2, present: false, enabled: false, production: true }] };
  const html = clean(render(<TicketFlagView name="tl-1" flag={flag} problem="" error="" busy={false} onChange={noop} onRemove={noop} />));
  expect(html).toContain('aria-label="Specialise in dev"');
  expect(html).toContain('aria-label="Specialise in staging"');
  expect(html).not.toContain('Specialise in prod'); // not there yet
  expect(html).toContain('25% · 1 rule');
  expect(html.match(/% ·|>\d+%</g)?.length).toBe(1); // only staging is summarised
});

test('specialising: helpers keep to flags.gg’s bounds (TL-822)', () => {
  expect(isGeneric({})).toBe(true); // before flags.gg sends them
  expect(isGeneric({ rollout: 100, rules: [] })).toBe(true);
  expect(isGeneric({ rollout: 50, rules: [] })).toBe(false);
  expect(isGeneric({ rollout: 100, rules: [{ attribute: 'key', operator: 'in', values: ['x'], serve: true }] })).toBe(false);
  const i18n = i18nFor('en');
  expect(specialSummary(i18n, { environment_id: 'd', name: 'd', level: 0, present: true, enabled: true, rollout: 10, rules: [] })).toBe('10%');
  const two = { attribute: 'plan', operator: 'in' as const, values: ['pro'], serve: true };
  expect(specialSummary(i18n, { environment_id: 'd', name: 'd', level: 0, present: true, enabled: true, rollout: 0, rules: [two, two] })).toBe('0% · 2 rules');
  expect(splitValues(' u_1, ,u_2,, ')).toEqual(['u_1', 'u_2']);
  expect(toRules([{ attribute: ' key ', operator: 'in', values: 'u_1, u_2', serve: true }])).toEqual([{ attribute: 'key', operator: 'in', values: ['u_1', 'u_2'], serve: true }]);
  expect(toRules([{ attribute: '', operator: 'in', values: 'x', serve: true }])).toBeNull();
  expect(toRules([{ attribute: 'key', operator: 'in', values: ' , ', serve: true }])).toBeNull();
  expect(toRules([])).toEqual([]);
});

test('the specialise editor shows the rollout and each rule, and offers Make generic only when specialised (TL-822)', () => {
  const env = { environment_id: 'dev', name: 'dev', level: 0, present: true, enabled: true, rollout: 25,
    rules: [{ attribute: 'key', operator: 'not_in' as const, values: ['u_1', 'u_2'], serve: false }] };
  const html = clean(render(<FlagSpecialiseEditor env={env} busy={false} onSave={noop} onCancel={noop} />));
  expect(html).toContain('value="25"');
  expect(html).toContain('value="u_1, u_2"');
  expect(html).toContain('aria-label="Rule 1 operator"');
  expect(html).toContain('Make generic');
  expect(html).toContain('Add rule');
  const plain = clean(render(<FlagSpecialiseEditor env={{ ...env, rollout: 100, rules: [] }} busy={false} onSave={noop} onCancel={noop} />));
  expect(plain).toContain('No rules: the rollout decides for everyone.');
  expect(plain).not.toContain('Make generic');
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

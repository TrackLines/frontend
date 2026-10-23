import { expect, test } from 'bun:test';
import { generatedAgent, personLabel, shownLabel } from './people';
import type { Assignee } from './api';
import { i18nFor } from './i18n';

const en = i18nFor('en');

const people: Assignee[] = [
  { id: 'user_me', label: 'You', kind: 'person', name: 'Max Hooton' },
  { id: 'user_other', label: 'Other Person', kind: 'person', name: 'Other Person' },
  { id: 'claude', label: 'claude', kind: 'ai' },
];

test('only the viewer is "You"; everyone else by name (TL-229)', () => {
  expect(personLabel(en, 'user_me', people)).toBe('You');
  expect(personLabel(en, 'user_other', people)).toBe('Other Person');
});

test('never "You" for someone unknown: a teammate while loading, a former member once loaded', () => {
  expect(personLabel(en, 'user_other')).toBe('A teammate');
  expect(personLabel(en, 'user_other', null)).toBe('A teammate');
  expect(personLabel(en, 'user_gone', people)).toBe('Former member');
});

test('agents, imports and nobody read as before', () => {
  expect(personLabel(en, 'claude', people)).toBe('claude');
  expect(personLabel(en, 'claude')).toBe('claude');
  expect(personLabel(en, 'legacy')).toBe('Imported');
  expect(personLabel(en, null)).toBe('Unassigned');
});

test('agents are named from the people list; revoked ones by what their generated name says (TL-269)', () => {
  const people = [{ id: 'claude-482193', label: 'Claude (keloran)', kind: 'ai' as const }];
  expect(personLabel(en, 'claude-482193', people)).toBe('Claude (keloran)');
  expect(personLabel(en, 'codex-123456', people)).toBe('Codex');
  expect(personLabel(en, 'agent-654321', people)).toBe('AI agent');
  expect(personLabel(en, 'BugFixes', people)).toBe('BugFixes'); // integrations stay as recorded
  expect(generatedAgent(en, 'claude')).toBeNull();
  expect(generatedAgent(en, 'claude-12')).toBeNull();
});

test('the viewer is "You" in their own language; the API keeps the English (TL-559)', () => {
  const me: Assignee = { id: 'user_me', label: 'You', kind: 'person' };
  expect(personLabel(i18nFor('en'), 'user_me', [me])).toBe('You');
  expect(personLabel(i18nFor('nl'), 'user_me', [me])).toBe('Jij');
  expect(shownLabel(i18nFor('nl'), { label: 'Bo' })).toBe('Bo');
});

import { expect, test } from 'bun:test';
import { generatedAgent, personLabel } from './people';
import type { Assignee } from './api';

const people: Assignee[] = [
  { id: 'user_me', label: 'You', kind: 'person', name: 'Max Hooton' },
  { id: 'user_other', label: 'Other Person', kind: 'person', name: 'Other Person' },
  { id: 'claude', label: 'claude', kind: 'ai' },
];

test('only the viewer is "You"; everyone else by name (TL-229)', () => {
  expect(personLabel('user_me', people)).toBe('You');
  expect(personLabel('user_other', people)).toBe('Other Person');
});

test('never "You" for someone unknown: a teammate while loading, a former member once loaded', () => {
  expect(personLabel('user_other')).toBe('A teammate');
  expect(personLabel('user_other', null)).toBe('A teammate');
  expect(personLabel('user_gone', people)).toBe('Former member');
});

test('agents, imports and nobody read as before', () => {
  expect(personLabel('claude', people)).toBe('claude');
  expect(personLabel('claude')).toBe('claude');
  expect(personLabel('legacy')).toBe('Imported');
  expect(personLabel(null)).toBe('Unassigned');
});

test('agents are named from the people list; revoked ones by what their generated name says (TL-269)', () => {
  const people = [{ id: 'claude-482193', label: 'Claude (keloran)', kind: 'ai' as const }];
  expect(personLabel('claude-482193', people)).toBe('Claude (keloran)');
  expect(personLabel('codex-123456', people)).toBe('Codex');
  expect(personLabel('agent-654321', people)).toBe('AI agent');
  expect(personLabel('BugFixes', people)).toBe('BugFixes'); // integrations stay as recorded
  expect(generatedAgent('claude')).toBeNull();
  expect(generatedAgent('claude-12')).toBeNull();
});

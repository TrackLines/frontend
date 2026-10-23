import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import type { Assignee } from './api';

// personLabel turns a ticket's created_by / assigned_to, or a comment's author, into something
// readable. People are recorded by Clerk user id (user_…) and named from the org's people list,
// which calls only the viewer "You" (TL-229: every person used to read as "You"). API keys and
// integrations are recorded by name (e.g. "claude-482193"), named from the people list too when it
// has them (agents), else shown as recorded (integrations, or keys since revoked).
// people: the org's people list (usePeople), or null while it loads.
export function personLabel(i18n: I18n, id: string | null | undefined, people: Assignee[] | null = null): string {
  if (!id) return i18n._(msg`Unassigned`);
  if (id === 'legacy') return i18n._(msg`Imported`);
  const person = people?.find((p) => p.id === id);
  if (person) return shownLabel(i18n, person); // agents too: "Claude", or "Claude (keloran)" for someone else's (TL-269)
  if (!id.startsWith('user_')) return generatedAgent(i18n, id) ?? id;
  return people === null ? i18n._(msg`A teammate`) : i18n._(msg`Former member`); // still loading, or no longer in the org
}

// shownLabel: a people-list entry's label as shown: the list calls the viewer "You" (in English, from
// the API; compare against that), shown in the viewer's language.
export const shownLabel = (i18n: I18n, p: Pick<Assignee, 'label'>) => (p.label === 'You' ? i18n._(msg`You`) : p.label);

// generatedAgent: an agent key's generated name ("claude-482193") as the agent it is ("Claude"), for
// keys no longer in the people list (revoked). Hand-named keys and integrations stay as recorded.
const GENERATED = /^(claude|codex|cursor|copilot|gemini|agent)-\d{6}$/;
export function generatedAgent(i18n: I18n, id: string): string | null {
  const m = GENERATED.exec(id);
  if (!m) return null;
  return m[1] === 'agent' ? i18n._(msg`AI agent`) : m[1][0].toUpperCase() + m[1].slice(1);
}

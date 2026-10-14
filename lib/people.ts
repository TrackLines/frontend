import type { Assignee } from './api';

// personLabel turns a ticket's created_by / assigned_to, or a comment's author, into something
// readable. People are recorded by Clerk user id (user_…) and named from the org's people list,
// which calls only the viewer "You" (TL-229: every person used to read as "You"). API keys and
// integrations are recorded by name (e.g. "claude-482193"), named from the people list too when it
// has them (agents), else shown as recorded (integrations, or keys since revoked).
// people: the org's people list (usePeople), or null while it loads.
export function personLabel(id: string | null | undefined, people: Assignee[] | null = null): string {
  if (!id) return 'Unassigned';
  if (id === 'legacy') return 'Imported';
  const person = people?.find((p) => p.id === id);
  if (person) return person.label; // agents too: "Claude", or "Claude (keloran)" for someone else's (TL-269)
  if (!id.startsWith('user_')) return generatedAgent(id) ?? id;
  return people === null ? 'A teammate' : 'Former member'; // still loading, or no longer in the org
}

// generatedAgent: an agent key's generated name ("claude-482193") as the agent it is ("Claude"), for
// keys no longer in the people list (revoked). Hand-named keys and integrations stay as recorded.
const GENERATED = /^(claude|codex|cursor|copilot|gemini|agent)-\d{6}$/;
export function generatedAgent(id: string): string | null {
  const m = GENERATED.exec(id);
  if (!m) return null;
  return m[1] === 'agent' ? 'AI agent' : m[1][0].toUpperCase() + m[1].slice(1);
}

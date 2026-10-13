import type { Assignee } from './api';

// personLabel turns a ticket's created_by / assigned_to, or a comment's author, into something
// readable. People are recorded by Clerk user id (user_…) and named from the org's people list,
// which calls only the viewer "You" (TL-229: every person used to read as "You"). API keys and
// integrations are recorded by name (e.g. "claude"), already readable.
// people: the org's people list (usePeople), or null while it loads.
export function personLabel(id: string | null | undefined, people: Assignee[] | null = null): string {
  if (!id) return 'Unassigned';
  if (id === 'legacy') return 'Imported';
  if (!id.startsWith('user_')) return id;
  const person = people?.find((p) => p.id === id);
  if (person) return person.label;
  return people === null ? 'A teammate' : 'Former member'; // still loading, or no longer in the org
}

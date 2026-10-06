// personLabel turns a ticket's created_by/assigned_to into something readable. Browser actions
// record the Clerk user id (user_…); boards are owner-only, so that id is always the viewer → "You".
// API-key actions record the key's name (e.g. "claude"), which is already readable.
export function personLabel(id: string | null | undefined): string {
  if (!id) return 'Unassigned';
  if (id === 'legacy') return 'Imported';
  return id.startsWith('user_') ? 'You' : id;
}

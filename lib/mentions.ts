import type { Assignee } from '@/lib/api';

export type MentionPerson = { id: string; name: string; username?: string };

// mentionPeople: the org's people (not AI keys) as the @ picker shows them, by real name.
export function mentionPeople(list: Assignee[]): MentionPerson[] {
  return list.filter((a) => a.kind === 'person').map((a) => ({ id: a.id, name: a.name || a.label, username: a.username || undefined }));
}

// mentionAt: the @word being typed at the caret ("@b|" → { start: index of @, query: "b" }), or
// null. The @ starts the text or follows a space, so emails don't open the picker.
export function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const m = /(^|\s)@([\p{L}\p{N}_.-]*)$/u.exec(text.slice(0, caret));
  return m ? { start: caret - m[2].length - 1, query: m[2] } : null;
}

// matchPeople: people whose username or any word of their real name starts with query.
export function matchPeople(people: MentionPerson[], query: string): MentionPerson[] {
  const q = query.toLowerCase();
  return people.filter((p) => [p.username ?? '', ...p.name.split(/\s+/)].some((w) => w.toLowerCase().startsWith(q)));
}

// mentionText: what choosing a person types: @username, or @Real Name (the backend matches both).
export const mentionText = (p: MentionPerson) => `@${p.username || p.name} `;

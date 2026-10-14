// A person's face dragged onto a ticket in standup assigns them (TL-266). Their drag id is kept
// apart from ticket ids so the board can tell the two drags apart.
const PREFIX = 'person:';
export const personDragId = (userId: string) => PREFIX + userId;
export const draggedPerson = (dragId: string): string | null => (dragId.startsWith(PREFIX) ? dragId.slice(PREFIX.length) : null);

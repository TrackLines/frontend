// Attachment limits (TL-253), kept in one place so they're easy to raise. The backend enforces the
// same (internal/attachments: MaxPerTicket, MaxFileBytes); raise both together.
export const MAX_FILES_PER_TICKET = 10;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// attachProblem: why these files can't be attached, or null when they can. Only says so when someone
// tries: the limits aren't advertised beforehand. existing: files the ticket already has (or, while
// creating one, those already added to the form).
export function attachProblem(existing: number, files: readonly { name: string; size: number }[]): string | null {
  const big = files.find((f) => f.size > MAX_FILE_BYTES);
  if (big) return `“${big.name}” is too big: files can be up to ${MAX_FILE_BYTES / 1024 / 1024} MB.`;
  if (existing + files.length > MAX_FILES_PER_TICKET) {
    const room = Math.max(0, MAX_FILES_PER_TICKET - existing);
    return room === 0
      ? `This ticket has as many files as it can hold (${MAX_FILES_PER_TICKET}). Remove one to add another.`
      : `A ticket can hold ${MAX_FILES_PER_TICKET} files, so only ${room} more can be added here.`;
  }
  return null;
}

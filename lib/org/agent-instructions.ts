// Additional agent instructions (TL-901): what a draft would do if saved. The backend trims the text and
// counts characters (code points, not UTF-16 units), so the same is done here and the two agree.
export const AGENT_INSTRUCTIONS_MAX = 4000;

export function draftState(draft: string, saved: string, max = AGENT_INSTRUCTIONS_MAX) {
  const text = draft.trim(); // what would be saved
  const length = [...text].length;
  return { text, length, tooLong: length > max, changed: text !== saved, clears: text === '' && saved !== '' };
}

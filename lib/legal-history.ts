import privacy20261017 from './legal-versions/privacy-2026-10-17';
import privacy20261025 from './legal-versions/privacy-2026-10-25';
import privacy20261026 from './legal-versions/privacy-2026-10-26';
import privacy20261027 from './legal-versions/privacy-2026-10-27';
import terms20261017 from './legal-versions/terms-2026-10-17';

// Every published version of the Terms of service and the Privacy policy (TL-424), oldest first.
// Published versions are never edited (a test pins them). To change a document: copy its newest file
// in lib/legal-versions to a new dated one, edit that, and add it here with a one-line summary of what
// changed. The live page shows the newest; everyone is told in-app about the new version (the backend
// reads /legal-versions.json).

export type LegalDoc = 'terms' | 'privacy';
export type LegalVersion = { version: string; summary: string; body: string }; // version: the date it took effect

export const HISTORY: Record<LegalDoc, LegalVersion[]> = {
  terms: [{ version: '2026-10-17', summary: 'First published version.', body: terms20261017 }],
  privacy: [
    { version: '2026-10-17', summary: 'First published version.', body: privacy20261017 },
    { version: '2026-10-25', summary: 'Lists every cookie and item of device storage, and says what deleting your account erases.', body: privacy20261025 },
    { version: '2026-10-26', summary: 'Adds ticket history and the audit log on Pro and Enterprise: what they record, who can see them and how long they’re kept.', body: privacy20261026 },
    { version: '2026-10-27', summary: 'Ticket history now records every change to a ticket and who made it, never the text of an edit.', body: privacy20261027 },
  ],
};

export const DOC_TITLE: Record<LegalDoc, string> = { terms: 'Terms of service', privacy: 'Privacy policy' };

export const current = (doc: LegalDoc): LegalVersion => HISTORY[doc].at(-1)!;
export const versionOf = (doc: LegalDoc, version: string) => HISTORY[doc].find((v) => v.version === version) ?? null;
export const previousOf = (doc: LegalDoc, version: string) => {
  const i = HISTORY[doc].findIndex((v) => v.version === version);
  return i > 0 ? HISTORY[doc][i - 1] : null;
};

// longDate: "17 October 2026", the date as written in the documents.
export const longDate = (version: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${version}T00:00:00Z`));

export type Change = { kind: 'same' | 'added' | 'removed'; text: string };

// changes: what changed between two versions, paragraph by paragraph (a longest-common-subsequence
// diff over blank-line-separated blocks, so a reworded bullet shows as removed then added).
export function changes(before: string, after: string): Change[] {
  const a = blocks(before), b = blocks(after);
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  }
  const out: Change[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) out.push({ kind: 'same', text: a[i++] }), j++;
    else if (j < b.length && (i === a.length || lcs[i][j + 1] > lcs[i + 1][j])) out.push({ kind: 'added', text: b[j++] }); // on a tie, the old wording first
    else out.push({ kind: 'removed', text: a[i++] });
  }
  return out;
}

// blocks: a document's paragraphs, headings and bullets, each one its own block.
const blocks = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

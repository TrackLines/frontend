import { HISTORY, type LegalDoc } from '@/lib/legal/legal-history';

// /legal-versions.json: every published version (no text), for the backend, which tells everyone
// in-app the first time it sees a new one (TL-424).
export const dynamic = 'force-static';

export function GET() {
  const list = (Object.keys(HISTORY) as LegalDoc[]).flatMap((doc) => HISTORY[doc].map((v) => ({ doc, version: v.version, summary: v.summary })));
  return Response.json(list);
}

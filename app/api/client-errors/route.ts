import type { NextRequest } from 'next/server';
import { allowReport, cleanReport, reportServer } from '@/lib/report';
import { readCapped } from '@/lib/proxy';

export const runtime = 'nodejs';

// POST /api/client-errors: the browser's errors, reported to Bugfixes from here (TL-292) so its
// credentials stay on the server. Rate limited before the body is read, and read only up to 16 KB
// (TL-382): over that it's a 413, unreported; otherwise always 204, so a page never retries or learns more.
export async function POST(request: NextRequest): Promise<Response> {
  const address = (request.headers.get('x-forwarded-for') ?? '').split(',').pop()?.trim() || 'unknown';
  if (!allowReport(address)) return new Response(null, { status: 204 });
  const bytes = await readCapped(request, 16_384).catch(() => new Uint8Array(new ArrayBuffer(0)));
  if (!bytes) return new Response('report too large', { status: 413 });
  const text = new TextDecoder().decode(bytes);
  {
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      // not JSON: nothing to report
    }
    const report = cleanReport(body);
    if (report) await reportServer(`browser ${report.kind}: ${report.message}`, `${report.path}\n${report.stack}`);
  }
  return new Response(null, { status: 204 });
}

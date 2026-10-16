import type { NextRequest } from 'next/server';
import { allowReport, cleanReport, reportServer } from '@/lib/report';

export const runtime = 'nodejs';

// POST /api/client-errors: the browser's errors, reported to Bugfixes from here (TL-292) so its
// credentials stay on the server. Rate limited; always 204, so a page never retries or learns more.
export async function POST(request: NextRequest): Promise<Response> {
  const address = (request.headers.get('x-forwarded-for') ?? '').split(',').pop()?.trim() || 'unknown';
  const text = await request.text().catch(() => '');
  if (text.length <= 16_384 && allowReport(address)) {
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

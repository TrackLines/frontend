import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import type { Attachment } from '@/lib/api';
import { AttachmentRow, downloadAttachment, PreviewBody, previewKind } from './attachments';

const a: Attachment = { id: 'a1', ticket_id: 't', key: 'k', url: 'https://x.ufs.sh/f/k', name: 'spec.pdf', size: 2048, content_type: 'application/pdf', created_by: 'Ava', created_at: '2025-10-01T00:00:00Z' };

test('a year-old file says when it goes and can be kept; others say nothing (TL-259)', () => {
  const due = renderToStaticMarkup(<AttachmentRow a={{ ...a, delete_on: '2026-11-14' }} locked={false} onRemove={() => {}} onKeep={() => {}} />);
  expect(due).toContain('Deleted on 14 Nov 2026 unless kept');
  expect(due).toContain('>Keep<');
  const fresh = renderToStaticMarkup(<AttachmentRow a={a} locked={false} onRemove={() => {}} onKeep={() => {}} />);
  expect(fresh).not.toContain('unless kept');
  expect(fresh).not.toContain('>Keep<');
  // a done ticket's files can't be removed, but a year-old one can still be kept
  const doneTicket = renderToStaticMarkup(<AttachmentRow a={{ ...a, delete_on: '2026-11-14' }} locked onRemove={() => {}} onKeep={() => {}} />);
  expect(doneTicket).toContain('>Keep<');
  expect(doneTicket).not.toContain('>Remove<');
});

test('a file says who uploaded it by name, not by user id', () => {
  const row = (people: { id: string; label: string }[] | null) =>
    renderToStaticMarkup(<AttachmentRow a={{ ...a, created_by: 'user_ava' }} people={people} locked={false} onRemove={() => {}} onKeep={() => {}} />);
  expect(row([{ id: 'user_ava', label: 'Ava' }])).toContain('Ava');
  expect(row([{ id: 'user_ava', label: 'Ava' }])).not.toContain('user_ava');
  expect(row([])).toContain('Former member');
});

test('previewKind: images, PDFs and media preview; documents and archives stay links (TL-489)', () => {
  expect(previewKind('image/png')).toBe('image');
  expect(previewKind('image/svg+xml')).toBe('image');
  expect(previewKind('application/pdf')).toBe('pdf');
  expect(previewKind('video/mp4')).toBe('video');
  expect(previewKind('audio/mpeg')).toBe('audio');
  expect(previewKind('application/zip')).toBeNull();
  expect(previewKind('application/octet-stream')).toBeNull();
});

test('the list stays a list: previewable files get a Preview button, others Download, nothing inline (TL-516)', () => {
  const row = (extra: Partial<Attachment>) => renderToStaticMarkup(<AttachmentRow a={{ ...a, ...extra }} locked={false} onRemove={() => {}} onKeep={() => {}} />);
  const img = row({ name: 'shot.png', content_type: 'image/png', url: 'https://x.ufs.sh/f/img' });
  expect(img).toContain('aria-label="Preview shot.png"');
  expect(img).not.toContain('aria-label="Download shot.png"');
  expect(img).not.toContain('<img');
  const pdf = row({});
  expect(pdf).toContain('aria-label="Preview spec.pdf"');
  expect(pdf).not.toContain('<iframe');
  const zip = row({ name: 'logs.zip', content_type: 'application/zip' });
  expect(zip).toContain('aria-label="Download logs.zip"');
  expect(zip).not.toContain('Preview');
});

test('the preview shows each kind as its own element (TL-516)', () => {
  const body = (kind: 'image' | 'pdf' | 'video' | 'audio') => renderToStaticMarkup(<PreviewBody a={a} kind={kind} />);
  expect(body('image')).toContain('<img');
  expect(body('pdf')).toContain('<iframe');
  expect(body('video')).toContain('<video');
  expect(body('audio')).toContain('<audio');
});

test('downloadAttachment saves under the file name, and opens the file when it can’t fetch it (TL-516)', async () => {
  const clicked: { href: string; download: string }[] = [];
  const opened: string[] = [];
  const g = globalThis as Record<string, unknown>;
  const realDoc = g.document;
  const { createObjectURL, revokeObjectURL } = URL;
  g.document = { createElement: () => ({ click(this: { href: string; download: string }) { clicked.push({ href: this.href, download: this.download }); } }) };
  URL.createObjectURL = () => 'blob:1';
  URL.revokeObjectURL = () => {};
  try {
    const ok = (async () => new Response('bytes')) as unknown as typeof fetch;
    expect(await downloadAttachment(a, ok, (u) => opened.push(u))).toBe('saved');
    expect(clicked).toEqual([{ href: 'blob:1', download: 'spec.pdf' }]);
    const cors = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    expect(await downloadAttachment(a, cors, (u) => opened.push(u))).toBe('opened');
    const missing = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    expect(await downloadAttachment(a, missing, (u) => opened.push(u))).toBe('opened');
    expect(opened).toEqual([a.url, a.url]);
  } finally {
    g.document = realDoc;
    Object.assign(URL, { createObjectURL, revokeObjectURL });
  }
});

test('removing someone else’s file says who can, as keeping does (TL-659, source)', async () => {
  const src = await Bun.file(new URL('./attachments.tsx', import.meta.url)).text();
  expect(src).toContain('err.status === 403 ? t`Only an organization admin or whoever uploaded it can remove this file.`');
});

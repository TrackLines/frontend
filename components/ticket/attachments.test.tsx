import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Attachment } from '@/lib/api';
import { AttachmentRow, previewKind } from './attachments';

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

test('a previewable file renders inline; a zip does not', () => {
  const img = renderToStaticMarkup(<AttachmentRow a={{ ...a, name: 'shot.png', content_type: 'image/png', url: 'https://x.ufs.sh/f/img' }} locked={false} onRemove={() => {}} onKeep={() => {}} />);
  expect(img).toContain('<img');
  expect(img).toContain('src="https://x.ufs.sh/f/img"');
  const pdf = renderToStaticMarkup(<AttachmentRow a={a} locked={false} onRemove={() => {}} onKeep={() => {}} />);
  expect(pdf).toContain('<iframe');
  const zip = renderToStaticMarkup(<AttachmentRow a={{ ...a, name: 'logs.zip', content_type: 'application/zip' }} locked={false} onRemove={() => {}} onKeep={() => {}} />);
  expect(zip).not.toContain('<iframe');
  expect(zip).not.toContain('<img');
});

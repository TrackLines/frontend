import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FileCleanup } from '@/lib/api';
import { FileCleanupLink, FileCleanupView, hasCleanup } from './file-cleanup';

const file = { ticket_id: 't1', ticket_key: 'TL-12', ticket_title: 'Fix login', name: 'screenshot.png', size: 2048, created_by: 'user_sam' };
const due: FileCleanup = { due: [{ ...file, id: 'a1', delete_on: '2027-11-14T09:00:00Z' }], deleted: [] };
const gone: FileCleanup = { due: [], deleted: [{ ...file, name: 'old.pdf', deleted_at: '2026-09-01T00:00:00Z' }] };
const people = [{ id: 'user_sam', label: 'Sam' }];

test('the clean-up link shows only when files are due to go or have gone (TL-261)', () => {
  expect(hasCleanup(null)).toBe(false);
  expect(hasCleanup({ due: [], deleted: [] })).toBe(false);
  expect(renderToStaticMarkup(<FileCleanupLink report={{ due: [], deleted: [] }} />)).toBe('');
  expect(renderToStaticMarkup(<FileCleanupLink report={null} />)).toBe('');
  const soon = renderToStaticMarkup(<FileCleanupLink report={due} />);
  expect(soon).toContain('href="/settings/file-cleanup"');
  expect(soon).toContain('1 year-old file is due to be deleted');
  expect(renderToStaticMarkup(<FileCleanupLink report={gone} />)).toContain('href="/settings/file-cleanup"');
});

test('the clean-up page lists due files with Keep, and deleted files, named and linked to their ticket', () => {
  const html = renderToStaticMarkup(<FileCleanupView report={{ due: due.due, deleted: gone.deleted }} people={people} onKeep={() => {}} />);
  expect(html).toContain('screenshot.png');
  expect(html).toContain('Deleted on 14 Nov 2027');
  expect(html).toContain('>Keep<');
  expect(html).toContain('old.pdf');
  expect(html).toContain('Deleted 1 Sept 2026');
  expect(html).toContain('href="/tickets/t1"');
  expect(html).toContain('Sam');
  expect(html).not.toContain('user_sam');
  const empty = renderToStaticMarkup(<FileCleanupView report={{ due: [], deleted: [] }} people={people} onKeep={() => {}} />);
  expect(empty).toContain('Nothing is due to be deleted.');
  expect(empty).not.toContain('>Keep<');
});

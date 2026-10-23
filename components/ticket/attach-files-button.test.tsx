import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { AttachFilesButton } from './attach-files-button';

// T-029A: the app's own Button (not UploadThing's bright blue prebuilt one) over a hidden file input
test('attach files is one of our buttons', () => {
  const html = renderToStaticMarkup(<AttachFilesButton target={{ ticketId: "00000000-0000-0000-0000-000000000001" }} onUploaded={() => {}} />);
  expect(html).toContain('>Attach files<');
  // iPad Safari: a label wrapping a visually hidden (not display:none) input opens the picker natively
  expect(html).toMatch(/<label[^>]*><input[^>]*type="file"[^>]*multiple[^>]*class="sr-only"/);
  expect(html).not.toMatch(/<input[^>]*hidden/);
  expect(html).not.toContain('data-ut-element');
});

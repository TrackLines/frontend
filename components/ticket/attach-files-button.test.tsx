import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { AttachFilesButton } from './attach-files-button';

// T-029A: the app's own Button (not UploadThing's bright blue prebuilt one) over a hidden file input
test('attach files is one of our buttons', () => {
  const html = renderToStaticMarkup(<AttachFilesButton onUploaded={() => {}} />);
  expect(html).toContain('data-slot="button"');
  expect(html).toContain('>Attach files<');
  expect(html).toMatch(/<input[^>]*type="file"[^>]*multiple[^>]*hidden/);
  expect(html).not.toContain('data-ut-element');
});

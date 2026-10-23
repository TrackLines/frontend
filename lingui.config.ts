import { defineConfig } from '@lingui/conf';
import { formatter } from '@lingui/format-po';

// Translations (TL-549): English is the source; the catalogues are .po files, which Weblate, Crowdin
// and Poedit all read. `bun run i18n` extracts new strings and compiles the catalogues.
export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'nl'],
  catalogs: [{ path: '<rootDir>/locales/{locale}/messages', include: ['app', 'components', 'lib'], exclude: ['**/*.test.*', '**/node_modules/**'] }],
  format: formatter({ lineNumbers: false }),
});

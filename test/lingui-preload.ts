import { plugin } from 'bun';
import { transformAsync } from '@babel/core';
import { existsSync, statSync } from 'node:fs';
import config from '../lingui.config';

// the compiled catalogues aren't committed (TL-652): `bun run test` compiles them first. A bare
// `bun test` can't (modules are resolved before this runs), so it says how; one older than its .po is
// recompiled here, since it already resolves.
const missing = config.locales.filter((l) => !existsSync(`locales/${l}/messages.ts`));
if (missing.length) throw new Error(`no compiled catalogues for ${missing.join(', ')}: run \`bun run test\` (or \`bun run i18n\`) instead of \`bun test\``);
const stale = config.locales.some((l) => statSync(`locales/${l}/messages.ts`).mtimeMs < statSync(`locales/${l}/messages.po`).mtimeMs);
if (stale && Bun.spawnSync(['bunx', 'lingui', 'compile', '--typescript'], { stdout: 'ignore', stderr: 'inherit' }).exitCode !== 0) {
  throw new Error('lingui compile failed');
}

// bun test has no SWC plugins: files that import a Lingui macro go through its Babel plugin instead,
// the same transform Next's @lingui/swc-plugin does (TL-550). Everything else loads as usual.
plugin({
  name: 'lingui-macro',
  setup(build) {
    build.onLoad({ filter: /\/(app|components|lib)\/.*\.tsx?$/ }, async ({ path }) => {
      const src = await Bun.file(path).text();
      const loader = path.endsWith('x') ? 'tsx' : 'ts';
      if (!/from ['"]@lingui\/(core|react)\/macro['"]/.test(src)) return { contents: src, loader };
      const out = await transformAsync(src, {
        filename: path, babelrc: false, configFile: false, retainLines: true,
        parserOpts: { plugins: ['typescript', 'jsx'] },
        plugins: ['@lingui/babel-plugin-lingui-macro'],
      });
      return { contents: out?.code ?? src, loader };
    });
  },
});

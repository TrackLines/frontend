import { plugin } from 'bun';
import { transformAsync } from '@babel/core';

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
